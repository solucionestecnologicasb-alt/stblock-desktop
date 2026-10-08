use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serialport::{SerialPort, SerialPortInfo};
use tauri::Manager;

// Arduino CLI integration module
mod arduino_cli;
use arduino_cli::*;

// Modo Aula: servidor relay WebSocket
mod classroom_server;
use classroom_server::*;

// Global storage for open serial ports
static SERIAL_PORTS: Lazy<Mutex<HashMap<String, Box<dyn SerialPort>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
fn prepare_for_update() {
    println!("[updater] Preparando para actualizar: no hay procesos secundarios que cerrar.");
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PortInfo {
    pub port_name: String,
    pub port_type: String,
    pub vid: Option<u16>,
    pub pid: Option<u16>,
    pub serial_number: Option<String>,
    pub manufacturer: Option<String>,
    pub product: Option<String>,
}

impl From<SerialPortInfo> for PortInfo {
    fn from(info: SerialPortInfo) -> Self {
        match info.port_type {
            serialport::SerialPortType::UsbPort(usb_info) => PortInfo {
                port_name: info.port_name,
                port_type: "USB".to_string(),
                vid: Some(usb_info.vid),
                pid: Some(usb_info.pid),
                serial_number: usb_info.serial_number,
                manufacturer: usb_info.manufacturer,
                product: usb_info.product,
            },
            serialport::SerialPortType::BluetoothPort => PortInfo {
                port_name: info.port_name,
                port_type: "Bluetooth".to_string(),
                vid: None,
                pid: None,
                serial_number: None,
                manufacturer: None,
                product: None,
            },
            serialport::SerialPortType::PciPort => PortInfo {
                port_name: info.port_name,
                port_type: "PCI".to_string(),
                vid: None,
                pid: None,
                serial_number: None,
                manufacturer: None,
                product: None,
            },
            serialport::SerialPortType::Unknown => PortInfo {
                port_name: info.port_name,
                port_type: "Unknown".to_string(),
                vid: None,
                pid: None,
                serial_number: None,
                manufacturer: None,
                product: None,
            },
        }
    }
}

#[tauri::command]
fn list_serial_ports() -> Result<Vec<PortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| e.to_string())?;
    Ok(ports.into_iter().map(PortInfo::from).collect())
}

#[tauri::command]
fn open_serial_port(port_name: String, baud_rate: u32) -> Result<String, String> {
    let mut ports = SERIAL_PORTS.lock().map_err(|e| e.to_string())?;
    if ports.contains_key(&port_name) {
        return Ok(port_name);
    }

    let port = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(100))
        .open()
        .map_err(|e| format!("Failed to open port {}: {}", port_name, e))?;

    let port_id = port_name.clone();
    ports.insert(port_id.clone(), port);

    Ok(port_id)
}

#[tauri::command]
fn close_serial_port(port_id: String) -> Result<(), String> {
    let mut ports = SERIAL_PORTS.lock().map_err(|e| e.to_string())?;
    // Toggle DTR low briefly to trigger bootloader reset on CH340/Arduino boards
    if let Some(port) = ports.get_mut(&port_id) {
        let _ = port.write_data_terminal_ready(false);
    }
    // Remove and drop the port (closes the file handle)
    drop(ports.remove(&port_id));
    // Brief delay to let the driver release the port
    std::thread::sleep(Duration::from_millis(300));
    Ok(())
}

#[tauri::command]
fn write_serial_port(port_id: String, data: Vec<u8>) -> Result<usize, String> {
    let mut ports = SERIAL_PORTS.lock().map_err(|e| e.to_string())?;
    let port = ports.get_mut(&port_id)
        .ok_or_else(|| format!("Port {} not found", port_id))?;

    port.write(&data).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_serial_port(port_id: String, size: usize) -> Result<Vec<u8>, String> {
    let mut ports = SERIAL_PORTS.lock().map_err(|e| e.to_string())?;
    let port = ports.get_mut(&port_id)
        .ok_or_else(|| format!("Port {} not found", port_id))?;

    let mut buffer = vec![0u8; size];
    match port.read(&mut buffer) {
        Ok(n) => {
            buffer.truncate(n);
            Ok(buffer)
        }
        Err(e) if e.kind() == std::io::ErrorKind::TimedOut => Ok(vec![]),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn read_serial_port_available(port_id: String) -> Result<usize, String> {
    let ports = SERIAL_PORTS.lock().map_err(|e| e.to_string())?;
    let port = ports.get(&port_id)
        .ok_or_else(|| format!("Port {} not found", port_id))?;

    port.bytes_to_read().map(|n| n as usize).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_serial_baud_rate(port_id: String, baud_rate: u32) -> Result<(), String> {
    let mut ports = SERIAL_PORTS.lock().map_err(|e| e.to_string())?;
    let port = ports.get_mut(&port_id)
        .ok_or_else(|| format!("Port {} not found", port_id))?;

    port.set_baud_rate(baud_rate).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_serial_dtr(port_id: String, level: bool) -> Result<(), String> {
    let mut ports = SERIAL_PORTS.lock().map_err(|e| e.to_string())?;
    let port = ports.get_mut(&port_id)
        .ok_or_else(|| format!("Port {} not found", port_id))?;

    port.write_data_terminal_ready(level).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_serial_rts(port_id: String, level: bool) -> Result<(), String> {
    let mut ports = SERIAL_PORTS.lock().map_err(|e| e.to_string())?;
    let port = ports.get_mut(&port_id)
        .ok_or_else(|| format!("Port {} not found", port_id))?;

    port.write_request_to_send(level).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_file(path: String, content: Vec<u8>) -> Result<(), String> {
    let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(&content).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Gearbot CRUD (replaces backend server /api/gears/*) ──

fn gears_base_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Use app local data directory for persistent Gearbot data
    let base = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("No se pudo obtener el directorio de datos: {}", e))?;
    let gears_dir = base.join("gears");
    std::fs::create_dir_all(&gears_dir.join("maps")).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&gears_dir.join("robots")).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&gears_dir.join("assets")).map_err(|e| e.to_string())?;
    Ok(gears_dir)
}

#[tauri::command]
fn gears_maps_list(app_handle: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let maps_dir = gears_dir.join("maps");
    let entries = std::fs::read_dir(&maps_dir).map_err(|e| e.to_string())?;
    let mut maps = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    maps.push(json);
                }
            }
        }
    }
    Ok(maps)
}

#[tauri::command]
fn gears_maps_get(app_handle: tauri::AppHandle, id: String) -> Result<serde_json::Value, String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let file_path = gears_dir.join("maps").join(format!("{}.json", id));
    if !file_path.exists() {
        return Err("Mapa no encontrado".to_string());
    }
    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn gears_maps_save(app_handle: tauri::AppHandle, id: String, data: serde_json::Value) -> Result<(), String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let file_path = gears_dir.join("maps").join(format!("{}.json", id));
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn gears_maps_delete(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let file_path = gears_dir.join("maps").join(format!("{}.json", id));
    if !file_path.exists() {
        return Err("Mapa no encontrado".to_string());
    }
    std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn gears_robots_list(app_handle: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let robots_dir = gears_dir.join("robots");
    let entries = std::fs::read_dir(&robots_dir).map_err(|e| e.to_string())?;
    let mut robots = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    robots.push(json);
                }
            }
        }
    }
    Ok(robots)
}

#[tauri::command]
fn gears_robots_get(app_handle: tauri::AppHandle, id: String) -> Result<serde_json::Value, String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let file_path = gears_dir.join("robots").join(format!("{}.json", id));
    if !file_path.exists() {
        return Err("Robot no encontrado".to_string());
    }
    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn gears_robots_save(app_handle: tauri::AppHandle, id: String, data: serde_json::Value) -> Result<(), String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let file_path = gears_dir.join("robots").join(format!("{}.json", id));
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn gears_robots_delete(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let file_path = gears_dir.join("robots").join(format!("{}.json", id));
    if !file_path.exists() {
        return Err("Robot no encontrado".to_string());
    }
    std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn gears_assets_get(app_handle: tauri::AppHandle, filename: String) -> Result<Vec<u8>, String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let file_path = gears_dir.join("assets").join(&filename);
    // Prevent directory traversal
    if !file_path.starts_with(&gears_dir.join("assets")) {
        return Err("Acceso denegado".to_string());
    }
    if !file_path.exists() {
        return Err("Archivo no encontrado".to_string());
    }
    std::fs::read(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn gears_assets_save(app_handle: tauri::AppHandle, filename: String, content: Vec<u8>) -> Result<(), String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let file_path = gears_dir.join("assets").join(&filename);
    // Prevent directory traversal
    if !file_path.starts_with(&gears_dir.join("assets")) {
        return Err("Acceso denegado".to_string());
    }
    std::fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn gears_assets_list(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let gears_dir = gears_base_dir(&app_handle)?;
    let assets_dir = gears_dir.join("assets");
    let entries = std::fs::read_dir(&assets_dir).map_err(|e| e.to_string())?;
    let mut files = Vec::new();
    for entry in entries.flatten() {
        if let Some(name) = entry.file_name().to_str() {
            files.push(name.to_string());
        }
    }
    Ok(files)
}

#[tauri::command]
fn install_drivers(app_handle: tauri::AppHandle) -> Result<String, String> {
    #[cfg(windows)]
    {
        use tauri::Manager;
        let resource_dir = app_handle.path().resource_dir()
            .map_err(|e| format!("Error al obtener el directorio de recursos: {}", e))?;
        
        let drivers_dir = resource_dir.join("drivers");
        
        let bat_file = if cfg!(target_pointer_width = "64") {
            "install_x64.bat"
        } else {
            "install_x86.bat"
        };
        
        let bat_path = drivers_dir.join(bat_file);
        
        if !bat_path.exists() {
            return Err(format!("El script de instalación de drivers no existe en: {:?}", bat_path));
        }
        
        // Spawn the installer script asynchronously
        std::process::Command::new("cmd")
            .args(["/c", bat_path.to_str().unwrap()])
            .current_dir(&drivers_dir)
            .spawn()
            .map_err(|e| format!("Error al iniciar el instalador de drivers: {}", e))?;
            
        Ok("Instalación de drivers iniciada en segundo plano.".to_string())
    }
    #[cfg(not(windows))]
    {
        let _ = app_handle;
        Ok("En Linux/ChromeOS los controladores serie (CH340, CP210x, CDC-ACM) están integrados en el sistema operativo.".to_string())
    }
}


#[tauri::command]
async fn fetch_update_policy(url: String) -> Result<serde_json::Value, String> {
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("No se pudo conectar con la política de actualización: {}", e))?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("No se pudo leer la política de actualización ({})", status));
    }
    response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("La política de actualización no es JSON válido: {}", e))
}

// ── Modo Aula: relay WebSocket ──

#[tauri::command]
async fn classroom_start_server(port: u16) -> Result<String, String> {
    start_classroom_server(port).await
}

#[tauri::command]
async fn classroom_stop_server() -> Result<(), String> {
    stop_classroom_server().await
}

#[tauri::command]
async fn classroom_is_running() -> bool {
    is_classroom_running().await
}

#[tauri::command]
fn classroom_local_ip() -> Vec<String> {
    local_ipv4_addresses()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            save_file,
            list_serial_ports,
            open_serial_port,
            close_serial_port,
            write_serial_port,
            read_serial_port,
            read_serial_port_available,
            set_serial_baud_rate,
            set_serial_dtr,
            set_serial_rts,
            // Arduino CLI commands
            check_arduino_cli,
            is_arduino_core_installed,
            install_arduino_core,
            compile_arduino_sketch,
            upload_arduino_sketch,
            upload_firmware,
            install_drivers,
            fetch_update_policy,
            prepare_for_update,
            // Modo Aula
            classroom_start_server,
            classroom_stop_server,
            classroom_is_running,
            classroom_local_ip,
            // Gearbot CRUD
            gears_maps_list,
            gears_maps_get,
            gears_maps_save,
            gears_maps_delete,
            gears_robots_list,
            gears_robots_get,
            gears_robots_save,
            gears_robots_delete,
            gears_assets_get,
            gears_assets_save,
            gears_assets_list
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Gearbot directories are created on-demand by gears_base_dir()
            println!("[launcher] Gearbot data directory ready (on-demand creation).");

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // Event loop with cleanup on exit or exit requested
    app.run(|_app_handle, event| {
        match event {
            tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                // No backend processes to clean up
            }
            _ => {}
        }
    });
}
