mod worker_manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(worker_manager::WorkerManager::new())
        .invoke_handler(tauri::generate_handler![
            worker_manager::detect_machine,
            worker_manager::register_machine,
            worker_manager::start_worker,
            worker_manager::stop_worker,
            worker_manager::pause_worker,
            worker_manager::resume_worker,
            worker_manager::get_worker_status,
            worker_manager::update_worker_settings,
            worker_manager::emergency_stop
        ])
        .run(tauri::generate_context!())
        .expect("error while running ComputeBNB provider");
}
