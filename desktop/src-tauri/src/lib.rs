mod saber_storage;

use saber_storage::SaberState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(SaberState::default())
        .invoke_handler(tauri::generate_handler![
            saber_storage::get_root,
            saber_storage::set_root,
            saber_storage::pick_folder,
            saber_storage::read_text,
            saber_storage::write_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
