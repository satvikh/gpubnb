#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            detect_machine,
            register_machine,
            start_worker,
            stop_worker
        ])
        .run(tauri::generate_context!())
        .expect("error while running ComputeBNB provider");
}

#[tauri::command]
fn detect_machine() -> serde_json::Value {
    serde_json::json!({
        "name": "Local provider node",
        "os": std::env::consts::OS,
        "cpu": "Native CPU detection pending",
        "memoryGb": 16
    })
}

#[tauri::command]
fn register_machine(settings: serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "machineId": "native-node-preview",
        "settings": settings
    })
}

#[tauri::command]
fn start_worker() -> bool {
    true
}

#[tauri::command]
fn stop_worker() -> bool {
    true
}
