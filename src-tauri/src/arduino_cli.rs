/**
 * Arduino CLI Integration for Tauri
 *
 * This module provides Tauri commands for compiling and uploading Arduino sketches.
 */

use std::process::Command;
use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArduinoCliInfo {
    pub available: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileResult {
    pub success: bool,
    pub hex_path: Option<String>,
    pub output: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

fn clean_path(path: PathBuf) -> PathBuf {
    let path_str = path.to_string_lossy().to_string();
    if path_str.starts_with(r"\\?\") {
        PathBuf::from(&path_str[4..])
    } else {
        path
    }
}

/// Helper function to resolve the path of the bundled or system arduino-cli
fn get_arduino_cli_path(app_handle: &tauri::AppHandle) -> String {
    // 1. Try to find arduino-cli in Tauri's bundled resources folder
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let bundled_path = clean_path(resource_dir.join("tools").join("Arduino").join("arduino-cli.exe"));
        if bundled_path.exists() {
            return bundled_path.to_string_lossy().to_string();
        }
    }

    // 2. Fallback to system PATH
    which::which("arduino-cli")
        .or_else(|_| which::which("arduino-cli.exe"))
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "arduino-cli".to_string())
}

/// Helper function to resolve the path of the bundled arduino-cli.yaml config file
fn get_arduino_config_path(app_handle: &tauri::AppHandle) -> Option<String> {
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let bundled_config = clean_path(resource_dir.join("tools").join("Arduino").join("arduino-cli.yaml"));
        if bundled_config.exists() {
            return Some(bundled_config.to_string_lossy().to_string());
        }
    }
    None
}

/// Resolve the directory containing the bundled preinstalled libraries.
///
/// Packaged apps ship them under `<resources>/tools/Arduino/libraries`.
/// Dev builds fall back to the source folder `<repo>/src-tauri/tools/Arduino/libraries`.
fn bundled_libraries_dir(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    // 1. Bundled resources: <resource_dir>/tools/Arduino/libraries
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let p = clean_path(resource_dir.join("tools").join("Arduino").join("libraries"));
        if p.is_dir() {
            return Some(p);
        }
    }

    // 2. Dev fallback: the binary lives at <repo>/src-tauri/target/{debug,release}/stblock.exe
    if let Ok(exe) = std::env::current_exe() {
        let cleaned_exe = clean_path(exe);
        if let Some(dir) = cleaned_exe
            .parent()
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
        {
            let p = dir.join("tools").join("Arduino").join("libraries");
            if p.is_dir() {
                return Some(p);
            }
        }
    }

    // 3. Last resort: <cwd>/tools/Arduino/libraries
    if let Ok(cwd) = std::env::current_dir() {
        let cleaned_cwd = clean_path(cwd);
        let p = cleaned_cwd.join("tools").join("Arduino").join("libraries");
        if p.is_dir() {
            return Some(p);
        }
    }

    // 4. Alternate dev fallback: <cwd>/src-tauri/tools/Arduino/libraries
    if let Ok(cwd) = std::env::current_dir() {
        let cleaned_cwd = clean_path(cwd);
        let p = cleaned_cwd.join("src-tauri").join("tools").join("Arduino").join("libraries");
        if p.is_dir() {
            return Some(p);
        }
    }

    None
}

/// Helper to create a pre-configured Command builder for arduino-cli
fn build_arduino_cli_command(app_handle: &tauri::AppHandle) -> Command {
    let cli_path = get_arduino_cli_path(app_handle);
    let mut cmd = Command::new(cli_path);
    if let Some(config_path) = get_arduino_config_path(app_handle) {
        cmd.args(["--config-file", &config_path]);
    }
    cmd
}

/// Check if Arduino CLI is installed and get version
#[tauri::command]
pub fn check_arduino_cli(app_handle: tauri::AppHandle) -> Result<ArduinoCliInfo, String> {
    let cli_path = get_arduino_cli_path(&app_handle);
    
    let mut cmd = build_arduino_cli_command(&app_handle);
    let output = cmd.arg("version").output();

    match output {
        Ok(out) => {
            let version = String::from_utf8_lossy(&out.stdout)
                .lines()
                .next()
                .map(|s| s.to_string());

            Ok(ArduinoCliInfo {
                available: true,
                version,
                path: Some(cli_path),
                error: None,
            })
        }
        Err(e) => {
            Ok(ArduinoCliInfo {
                available: false,
                version: None,
                path: None,
                error: Some(format!("Arduino CLI no encontrado: {}. Asegúrate de que el paquete de recursos esté presente.", e)),
            })
        }
    }
}

/// Check if a board core is installed
#[tauri::command]
pub fn is_arduino_core_installed(app_handle: tauri::AppHandle, platform: String) -> Result<bool, String> {
    let mut cmd = build_arduino_cli_command(&app_handle);
    let output = cmd
        .args(["core", "list", "--format", "json"])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Simple check if platform appears in installed cores
    Ok(stdout.contains(&platform))
}

/// Install an Arduino core
#[tauri::command]
pub fn install_arduino_core(app_handle: tauri::AppHandle, platform: String) -> Result<bool, String> {
    let mut cmd = build_arduino_cli_command(&app_handle);
    let output = cmd
        .args(["core", "install", &platform])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(true)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to install core: {}", stderr))
    }
}

/// Compile an Arduino sketch
#[tauri::command]
pub fn compile_arduino_sketch(
    app_handle: tauri::AppHandle,
    code: String,
    fqbn: String,
    sketch_name: String,
) -> Result<CompileResult, String> {
    // Diagnostic logging
    let debug_path = std::env::temp_dir().join("stblock_compile_debug.txt");
    let mut debug_info = format!("Sketch compilation started\n");
    debug_info.push_str(&format!("FQBN: {}\n", fqbn));
    debug_info.push_str(&format!("Sketch Name: {}\n", sketch_name));
    
    if let Ok(rd) = app_handle.path().resource_dir() {
        debug_info.push_str(&format!("Resource Dir: {:?}\n", rd));
        debug_info.push_str(&format!("Resource Dir exists: {}\n", rd.exists()));
        let libs = rd.join("tools").join("Arduino").join("libraries");
        debug_info.push_str(&format!("Resource Libs Path: {:?}\n", libs));
        debug_info.push_str(&format!("Resource Libs Path exists: {}\n", libs.is_dir()));
    } else {
        debug_info.push_str("Resource Dir error\n");
    }

    if let Ok(exe) = std::env::current_exe() {
        debug_info.push_str(&format!("Current Exe: {:?}\n", exe));
        if let Some(dir) = exe.parent().and_then(|p| p.parent()).and_then(|p| p.parent()) {
            debug_info.push_str(&format!("Exe Ancestor Dir: {:?}\n", dir));
            let p = dir.join("tools").join("Arduino").join("libraries");
            debug_info.push_str(&format!("Exe Ancestor Libs: {:?}\n", p));
            debug_info.push_str(&format!("Exe Ancestor Libs exists: {}\n", p.is_dir()));
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        debug_info.push_str(&format!("CWD: {:?}\n", cwd));
        let p1 = cwd.join("tools").join("Arduino").join("libraries");
        debug_info.push_str(&format!("CWD/tools Libs exists: {}\n", p1.is_dir()));
        let p2 = cwd.join("src-tauri").join("tools").join("Arduino").join("libraries");
        debug_info.push_str(&format!("CWD/src-tauri Libs exists: {}\n", p2.is_dir()));
    }

    let libs_dir = bundled_libraries_dir(&app_handle);
    debug_info.push_str(&format!("bundled_libraries_dir result: {:?}\n", libs_dir));

    let cli_path = get_arduino_cli_path(&app_handle);
    debug_info.push_str(&format!("arduino-cli path: {}\n", cli_path));

    let config_path = get_arduino_config_path(&app_handle);
    debug_info.push_str(&format!("arduino-cli config path: {:?}\n", config_path));

    let _ = fs::write(debug_path, debug_info);

    // Create temp directory for sketch
    let temp_dir = std::env::temp_dir().join("stblock_sketches");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let sketch_dir = temp_dir.join(&sketch_name);
    fs::create_dir_all(&sketch_dir).map_err(|e| e.to_string())?;

    // Write sketch file
    let sketch_file = sketch_dir.join(format!("{}.ino", sketch_name));
    fs::write(&sketch_file, &code).map_err(|e| e.to_string())?;

    // Build output directory
    let build_dir = sketch_dir.join("build");
    fs::create_dir_all(&build_dir).map_err(|e| e.to_string())?;

    // Compile
    let mut cmd = build_arduino_cli_command(&app_handle);
    cmd.args(["compile", "--fqbn", &fqbn, "--output-dir", build_dir.to_str().unwrap()]);
    // Add the bundled preinstalled libraries (Servo, etc.) so sketches compile
    // even when the arduino-cli user/data directories lack them.
    if let Some(libs_dir) = bundled_libraries_dir(&app_handle) {
        cmd.arg("--libraries").arg(libs_dir);
    }
    cmd.arg(sketch_dir.to_str().unwrap());
    let output = cmd.output().map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        // Find the hex file
        let hex_file = build_dir.join(format!("{}.ino.hex", sketch_name));
        let elf_file = build_dir.join(format!("{}.ino.elf", sketch_name));
        let bin_file = build_dir.join(format!("{}.ino.bin", sketch_name));

        let hex_path = if hex_file.exists() {
            Some(hex_file.to_string_lossy().to_string())
        } else if elf_file.exists() {
            Some(elf_file.to_string_lossy().to_string())
        } else if bin_file.exists() {
            Some(bin_file.to_string_lossy().to_string())
        } else {
            // Search for any .hex, .elf, or .bin file
            fs::read_dir(&build_dir)
                .ok()
                .and_then(|entries| {
                    entries
                        .filter_map(|e| e.ok())
                        .find(|e| {
                            let name = e.file_name().to_string_lossy().to_string();
                            name.ends_with(".hex") || name.ends_with(".elf") || name.ends_with(".bin")
                        })
                        .map(|e| e.path().to_string_lossy().to_string())
                })
        };

        Ok(CompileResult {
            success: true,
            hex_path,
            output: format!("{}\n{}", stdout, stderr),
            error: None,
        })
    } else {
        Ok(CompileResult {
            success: false,
            hex_path: None,
            output: stdout,
            error: Some(stderr),
        })
    }
}

/// Upload compiled sketch to device
#[tauri::command]
pub fn upload_arduino_sketch(
    app_handle: tauri::AppHandle,
    hex_path: String,
    port: String,
    fqbn: String,
) -> Result<UploadResult, String> {
    // Get the sketch directory from hex path
    let hex_file = PathBuf::from(&hex_path);
    let build_dir = hex_file.parent().ok_or("Invalid hex path")?;
    let sketch_dir = build_dir.parent().ok_or("Invalid build directory")?;

    // Upload using arduino-cli
    let mut cmd = build_arduino_cli_command(&app_handle);
    let output = cmd
        .args([
            "upload",
            "--fqbn", &fqbn,
            "--port", &port,
            "--input-dir", build_dir.to_str().unwrap(),
            sketch_dir.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(UploadResult {
            success: true,
            output: format!("{}\n{}", stdout, stderr),
            error: None,
        })
    } else {
        Ok(UploadResult {
            success: false,
            output: stdout,
            error: Some(stderr),
        })
    }
}

/// Upload precompiled firmware binary (passed as raw bytes) to device
#[tauri::command]
pub fn upload_firmware(
    app_handle: tauri::AppHandle,
    content: Vec<u8>,
    port: String,
    fqbn: String,
) -> Result<UploadResult, String> {
    // Create a temporary folder for the upload
    let temp_dir = std::env::temp_dir().join("stblock_sketches");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let upload_dir = temp_dir.join("firmware_upload");
    fs::create_dir_all(&upload_dir).map_err(|e| e.to_string())?;

    // Write the .hex file with a sketch-compatible name (for --input-dir fallback)
    let hex_file_path = upload_dir.join("firmware.ino.hex");
    fs::write(&hex_file_path, &content).map_err(|e| e.to_string())?;

    // Also write a minimal .ino sketch (required by --input-dir)
    let sketch_file_path = upload_dir.join("firmware.ino");
    fs::write(&sketch_file_path, "void setup(){}\nvoid loop(){}")
        .map_err(|e| e.to_string())?;

    // Upload using arduino-cli
    // Strategy: try --input-file first (direct .hex upload, cleaner).
    // If that fails, fall back to --input-dir with the complete structure.
    let mut cmd = build_arduino_cli_command(&app_handle);
    let output = cmd
        .args([
            "upload",
            "--fqbn", &fqbn,
            "--port", &port,
            "--input-file", hex_file_path.to_str().unwrap(),
            "-v",
        ])
        .output();

    let output = match output {
        Ok(out) => out,
        Err(e) => {
            let _ = fs::remove_dir_all(&upload_dir);
            return Err(format!("Failed to execute arduino-cli: {}", e));
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    // If --input-file succeeded, we're done
    if output.status.success() {
        let _ = fs::remove_dir_all(&upload_dir);
        return Ok(UploadResult {
            success: true,
            output: stdout,
            error: None,
        });
    }

    // --input-file failed. Try with --input-dir (older arduino-cli versions)
    // Wait a moment before retry (board may need reset)
    std::thread::sleep(std::time::Duration::from_millis(500));

    let mut cmd2 = build_arduino_cli_command(&app_handle);
    let retry_output = cmd2
        .args([
            "upload",
            "--fqbn", &fqbn,
            "--port", &port,
            "--input-dir", upload_dir.to_str().unwrap(),
            "-v",
        ])
        .output();

    let _ = fs::remove_dir_all(&upload_dir);

    match retry_output {
        Ok(out) if out.status.success() => {
            Ok(UploadResult {
                success: true,
                output: format!("{}\n{}",
                    String::from_utf8_lossy(&out.stdout),
                    String::from_utf8_lossy(&out.stderr)),
                error: None,
            })
        }
        Ok(out) => {
            // Both methods failed – report the original error (more relevant)
            Ok(UploadResult {
                success: false,
                output: stdout,
                error: Some(format!(
                    "{}\n(Retry with --input-dir also failed: {})",
                    stderr,
                    String::from_utf8_lossy(&out.stderr)
                )),
            })
        }
        Err(e) => {
            Ok(UploadResult {
                success: false,
                output: stdout,
                error: Some(format!("{}\nRetry error: {}", stderr, e)),
            })
        }
    }
}
