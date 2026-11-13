fn main() {
  // Dev uses the webpack server. Do not require (or copy) a production UI
  // build just to run `pnpm tauri dev` on a fresh checkout.
  if tauri_build::is_dev()
    && std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("android")
  {
    let mut config: serde_json::Value = std::env::var("TAURI_CONFIG")
      .map(|value| serde_json::from_str(&value).expect("valid TAURI_CONFIG"))
      .unwrap_or_else(|_| serde_json::json!({}));
    let resources = &mut config["bundle"]["resources"];
    if resources.is_null() {
      *resources = serde_json::json!({});
    }
    if let Some(map) = resources.as_object_mut() {
      // TAURI_CONFIG is a JSON Merge Patch; null removes this map entry.
      map.insert("../scratch-gui/build/".into(), serde_json::Value::Null);
    }
    std::env::set_var("TAURI_CONFIG", config.to_string());
  }
  tauri_build::build()
}
