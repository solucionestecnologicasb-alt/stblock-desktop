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
#[cfg(not(target_os = "android"))]
mod resource_assets;
#[cfg(not(target_os = "android"))]
mod resource_files;
use arduino_cli::*;

// Modo Aula: servidor relay WebSocket
mod classroom_server;
use classroom_server::*;

// Global storage for open serial ports
static SERIAL_PORTS: Lazy<Mutex<HashMap<String, Box<dyn SerialPort>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
fn prepare_for_update() {
    println!("[updater] Preparando para actualizar: cerrando procesos secundarios...");
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

    let mut port = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(100))
        .open()
        .map_err(|e| format!("Failed to open port {}: {}", port_name, e))?;

    let _ = port.write_data_terminal_ready(true);
    let _ = port.write_request_to_send(true);

    let port_id = port_name.clone();
    ports.insert(port_id.clone(), port);

    Ok(port_id)
}

#[tauri::command]
fn close_serial_port(port_id: String) -> Result<(), String> {
    release_serial_port(&port_id);
    Ok(())
}

/// Release and close serial port handle from SERIAL_PORTS safely
pub fn release_serial_port(target_port: &str) {
    if let Ok(mut ports) = SERIAL_PORTS.lock() {
        let keys_to_remove: Vec<String> = ports.keys()
            .filter(|k| {
                let k_upper = k.to_uppercase();
                let t_upper = target_port.to_uppercase();
                k_upper == t_upper || k_upper.contains(&t_upper) || t_upper.contains(&k_upper)
            })
            .cloned()
            .collect();
        for k in keys_to_remove {
            if let Some(mut p) = ports.remove(&k) {
                let _ = p.write_data_terminal_ready(false);
                drop(p);
            }
        }
    }
    // Brief delay to let the OS / USB serial driver release the port handle
    std::thread::sleep(Duration::from_millis(400));
}

#[tauri::command]
fn write_serial_port(port_id: String, data: Vec<u8>) -> Result<usize, String> {
    let mut ports = SERIAL_PORTS.lock().map_err(|e| e.to_string())?;
    let port = ports.get_mut(&port_id)
        .ok_or_else(|| format!("Port {} not found", port_id))?;

    let n = port.write(&data).map_err(|e| e.to_string())?;
    let _ = port.flush();
    Ok(n)
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

// ── Gearbot CRUD (replaces the removed Node backend /api/gears/*) ──

/// Rejects names that could escape the Gearbot data directories.
fn safe_file_name(value: &str) -> Result<&str, String> {
    let name = value.trim();
    if name.is_empty()
        || name == "."
        || name == ".."
        || name.contains('/')
        || name.contains('\\')
        || name.contains('\0')
    {
        return Err("Nombre de archivo inválido".to_string());
    }
    Ok(name)
}

fn gears_base_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("No se pudo obtener el directorio de datos: {}", e))?;
    let gears_dir = base.join("gears");
    std::fs::create_dir_all(gears_dir.join("maps")).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(gears_dir.join("robots")).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(gears_dir.join("assets")).map_err(|e| e.to_string())?;
    Ok(gears_dir)
}

fn read_json_dir(dir: &std::path::Path) -> Result<Vec<serde_json::Value>, String> {
    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    items.push(json);
                }
            }
        }
    }
    Ok(items)
}

fn read_json_file(path: &std::path::Path, not_found: &str) -> Result<serde_json::Value, String> {
    if !path.exists() {
        return Err(not_found.to_string());
    }
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn write_json_file(path: &std::path::Path, data: &serde_json::Value) -> Result<(), String> {
    let content = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn gears_maps_list(app_handle: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let maps_dir = gears_base_dir(&app_handle)?.join("maps");
    read_json_dir(&maps_dir)
}

#[tauri::command]
fn gears_maps_get(app_handle: tauri::AppHandle, id: String) -> Result<serde_json::Value, String> {
    let id = safe_file_name(&id)?;
    let file_path = gears_base_dir(&app_handle)?
        .join("maps")
        .join(format!("{}.json", id));
    read_json_file(&file_path, "Mapa no encontrado")
}

#[tauri::command]
fn gears_maps_save(
    app_handle: tauri::AppHandle,
    id: String,
    data: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let id = safe_file_name(&id)?;
    let file_path = gears_base_dir(&app_handle)?
        .join("maps")
        .join(format!("{}.json", id));
    write_json_file(&file_path, &data)?;
    Ok(serde_json::json!({"success": true, "id": id}))
}

#[tauri::command]
fn gears_maps_delete(app_handle: tauri::AppHandle, id: String) -> Result<serde_json::Value, String> {
    let id = safe_file_name(&id)?;
    let file_path = gears_base_dir(&app_handle)?
        .join("maps")
        .join(format!("{}.json", id));
    if !file_path.exists() {
        return Err("Mapa no encontrado".to_string());
    }
    std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({"success": true}))
}

#[tauri::command]
fn gears_robots_list(app_handle: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let robots_dir = gears_base_dir(&app_handle)?.join("robots");
    read_json_dir(&robots_dir)
}

#[tauri::command]
fn gears_robots_get(app_handle: tauri::AppHandle, id: String) -> Result<serde_json::Value, String> {
    let id = safe_file_name(&id)?;
    let file_path = gears_base_dir(&app_handle)?
        .join("robots")
        .join(format!("{}.json", id));
    read_json_file(&file_path, "Robot no encontrado")
}

#[tauri::command]
fn gears_robots_save(
    app_handle: tauri::AppHandle,
    id: String,
    data: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let id = safe_file_name(&id)?;
    let file_path = gears_base_dir(&app_handle)?
        .join("robots")
        .join(format!("{}.json", id));
    write_json_file(&file_path, &data)?;
    Ok(serde_json::json!({"success": true, "id": id}))
}

#[tauri::command]
fn gears_robots_delete(app_handle: tauri::AppHandle, id: String) -> Result<serde_json::Value, String> {
    let id = safe_file_name(&id)?;
    let file_path = gears_base_dir(&app_handle)?
        .join("robots")
        .join(format!("{}.json", id));
    if !file_path.exists() {
        return Err("Robot no encontrado".to_string());
    }
    std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({"success": true}))
}

#[tauri::command]
fn gears_assets_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    let assets_dir = gears_base_dir(&app_handle)?.join("assets");
    Ok(assets_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn gears_assets_get(app_handle: tauri::AppHandle, filename: String) -> Result<Vec<u8>, String> {
    let filename = safe_file_name(&filename)?;
    let file_path = gears_base_dir(&app_handle)?.join("assets").join(filename);
    if !file_path.exists() {
        return Err("Archivo no encontrado".to_string());
    }
    std::fs::read(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn gears_assets_save(
    app_handle: tauri::AppHandle,
    filename: String,
    content: Vec<u8>,
) -> Result<serde_json::Value, String> {
    let filename = safe_file_name(&filename)?;
    let file_path = gears_base_dir(&app_handle)?.join("assets").join(filename);
    std::fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "success": true,
        "filename": filename,
        "path": file_path.to_string_lossy().to_string()
    }))
}

#[tauri::command]
fn gears_assets_list(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let assets_dir = gears_base_dir(&app_handle)?.join("assets");
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
    #[cfg(target_os = "android")]
    {
        let _ = url;
        Err("Las actualizaciones en Android son gestionadas por Google Play Store".to_string())
    }
    #[cfg(not(target_os = "android"))]
    {
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
    #[cfg(not(target_os = "android"))]
    let context = tauri::generate_context!(assets = resource_assets::ResourceAssets::default());
    #[cfg(target_os = "android")]
    let context = tauri::generate_context!();
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(not(target_os = "android"))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    let app = builder
        .invoke_handler(tauri::generate_handler![
            save_file,
            // Gearbot CRUD
            gears_maps_list,
            gears_maps_get,
            gears_maps_save,
            gears_maps_delete,
            gears_robots_list,
            gears_robots_get,
            gears_robots_save,
            gears_robots_delete,
            gears_assets_dir,
            gears_assets_get,
            gears_assets_save,
            gears_assets_list,
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
            classroom_local_ip
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .build(context)
        .expect("error while building tauri application");

    app.run(|_app_handle, _event| {});
}
