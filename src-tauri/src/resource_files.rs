//! Filesystem reader shared by the Tauri asset provider and standalone tests.
use std::path::{Component, Path};

pub(crate) fn read_asset(root: &Path, key: &str) -> Option<Vec<u8>> {
    let relative = Path::new(key.strip_prefix('/').unwrap_or(key));
    if relative.as_os_str().is_empty()
        || relative.components().any(|part| !matches!(part, Component::Normal(_)))
    {
        return None;
    }
    let root = root.canonicalize().ok()?;
    let file = root.join(relative).canonicalize().ok()?;
    if !file.starts_with(&root) || !file.is_file() {
        return None;
    }
    std::fs::read(file).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serves_binary_assets_and_rejects_escape_paths() {
        let dir = std::env::temp_dir().join(format!("stblock-assets-{}", std::process::id()));
        std::fs::create_dir_all(dir.join("voice")).unwrap();
        std::fs::write(dir.join("voice/test.wav"), [0, 1, 255]).unwrap();
        assert_eq!(read_asset(&dir, "/voice/test.wav"), Some(vec![0, 1, 255]));
        for invalid in ["/", "../outside", "/../outside", "voice/../../outside", "missing.wav"] {
            assert_eq!(read_asset(&dir, invalid), None, "{invalid}");
        }
        #[cfg(windows)]
        for invalid in ["C:\\Windows\\win.ini", "\\Windows\\win.ini", "voice\\..\\..\\outside"] {
            assert_eq!(read_asset(&dir, invalid), None);
        }
        std::fs::remove_dir_all(dir).unwrap();
    }
}
