use std::collections::HashMap;
use std::io::{Read, Write};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serialport::{SerialPort, SerialPortInfo};
use tauri::Manager;

// Windows: para ocultar ventanas de consola de los backends
#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// Arduino CLI integration module
mod arduino_cli;
use arduino_cli::*;

// Modo Aula: servidor relay WebSocket
mod classroom_server;
use classroom_server::*;

// Global storage for open serial ports
static SERIAL_PORTS: Lazy<Mutex<HashMap<String, Box<dyn SerialPort>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

// ── Backend process management ──
static BACKEND_PROCESSES: Lazy<Mutex<Vec<Child>>> = Lazy::new(|| Mutex::new(Vec::new()));

/// Launches a backend process from the Tauri resources directory.
/// Falls back to dev-mode paths if not running from a Tauri bundle.
fn launch_backend(
    app_handle: &tauri::AppHandle,
    name: &str,
    exe_name: &str,
    port: u16,
    extra_env: Vec<(&str, String)>,
) {
    // Resolve the executable path
    let exe_path = app_handle
        .path()
        .resource_dir()
        .ok()
        .map(|d| d.join("backends").join(exe_name))
        .filter(|p| p.exists());

    let mut cmd = if let Some(ref path) = exe_path {
        println!("[launcher] {} encontrado en: {:?}", name, path);
        Command::new(path)
    } else {
        // Dev-mode fallback: look in src-tauri/backends/ relative to current dir
        let dev_path = std::env::current_dir()
            .ok()
            .map(|d| d.join("backends").join(exe_name))
            .filter(|p| p.exists());
        if let Some(ref dp) = dev_path {
            println!("[launcher] {} (dev): {:?}", name, dp);
            Command::new(dp)
        } else {
            println!("[launcher] {} no encontrado — saltando", name);
            return;
        }
    };

    // Set BUNDLE_RESOURCES_DIR so subprocesses can find tools (arduino-cli, etc.)
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let res_str = resource_dir.to_string_lossy().to_string();
        cmd.env("BUNDLE_RESOURCES_DIR", &res_str);
        // For server.js: set STBLOCK_APP_DIR so it finds backend/data/gears/
        cmd.env("STBLOCK_APP_DIR", &res_str);
    }

    // Set extra environment variables
    for (key, val) in extra_env {
        cmd.env(key, val);
    }

    // Windows: ocultar la ventana de consola del proceso
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    // Spawn the process
    match cmd.spawn() {
        Ok(child) => {
            if let Ok(mut guard) = BACKEND_PROCESSES.lock() {
                guard.push(child);
            }
            println!("[launcher] {} iniciado en puerto {}", name, port);
        }
        Err(e) => {
            eprintln!("[launcher] Error al iniciar {}: {}", name, e);
        }
    }
}

/// Kills all tracked backend processes.
fn kill_all_backends() {
    if let Ok(mut guard) = BACKEND_PROCESSES.lock() {
        for child in guard.iter_mut() {
            let _ = child.kill();
            let _ = child.wait();
        }
        guard.clear();
    }
    println!("[launcher] Procesos backend finalizados.");
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

#[tauri::command]
fn install_drivers(app_handle: tauri::AppHandle) -> Result<String, String> {
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

            // ── Launch backend processes ──
            let handle = app.handle();

            // Backend server (port 3001) — AI chat + Gearbot CRUD
            launch_backend(
                handle,
                "Backend Server",
                "stblock-backend-server.exe",
                3001,
                vec![("PORT", "3001".to_string())],
            );

            // Compile proxy (port 8000) — Arduino compilation for Velxio
            launch_backend(
                handle,
                "Compile Proxy",
                "compile-proxy.exe",
                8000,
                vec![],
            );

            println!("[launcher] Backends lanzados. La app puede tardar unos segundos en estar lista.");

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // Event loop with cleanup on exit
    app.run(|_app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            kill_all_backends();
        }
    });
}
