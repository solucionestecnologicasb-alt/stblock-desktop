//! Serve the desktop UI from installed resources instead of embedding gigabytes
//! in Rust metadata. Keep Tauri's normal protocol, MIME handling and IPC origin.
use std::path::{Path, PathBuf};
use crate::resource_files::read_asset;

#[derive(Default)]
pub struct ResourceAssets {
    root: std::sync::OnceLock<PathBuf>,
}

impl<R: tauri::Runtime> tauri::Assets<R> for ResourceAssets {
    fn setup(&self, app: &tauri::App<R>) {
        use tauri::Manager;
        let root = app.path().resource_dir().expect("application resource directory").join("frontend");
        self.root.set(root).ok();
    }

    fn get(&self, key: &tauri::utils::assets::AssetKey) -> Option<std::borrow::Cow<'_, [u8]>> {
        read_asset(self.root.get()?, key.as_ref()).map(std::borrow::Cow::Owned)
    }

    fn iter(&self) -> Box<tauri::utils::assets::AssetsIter<'_>> {
        fn visit(root: &Path, dir: &Path, files: &mut Vec<String>) {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Ok(kind) = entry.file_type() {
                        if kind.is_dir() { visit(root, &path, files); }
                        else if kind.is_file() {
                            if let Ok(relative) = path.strip_prefix(root) {
                                files.push(format!("/{}", relative.to_string_lossy().replace('\\', "/")));
                            }
                        }
                    }
                }
            }
        }
        let mut files = Vec::new();
        if let Some(root) = self.root.get() { visit(root, root, &mut files); }
        Box::new(files.into_iter().filter_map(move |key| {
            let bytes = read_asset(self.root.get()?, &key)?;
            Some((std::borrow::Cow::Owned(key), std::borrow::Cow::Owned(bytes)))
        }))
    }

    fn csp_hashes(&self, _: &tauri::utils::assets::AssetKey) -> Box<dyn Iterator<Item = tauri::utils::assets::CspHash<'_>> + '_> {
        // This application explicitly configures security.csp = null.
        Box::new(std::iter::empty())
    }
}

