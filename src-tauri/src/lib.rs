// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Emitter, WindowEvent};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Called by the frontend after the user confirms it is safe to close.
/// Destroys the window directly, bypassing the CloseRequested guard.
#[tauri::command]
fn force_close(window: tauri::Window) {
    window.destroy().ok();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, force_close])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Prevent the OS from closing the window immediately.
                // Instead, emit an event so the frontend can show the unsaved-changes
                // dialog and decide whether to actually close via force_close.
                api.prevent_close();
                window.emit("close-requested", ()).ok();
            }
        })
        .setup(|app| {
            // On macOS: only keep the standard app submenu (app name, Hide, Quit, etc.)
            // This removes File/Edit/View/Window/Help from the menu bar while keeping
            // the Apple menu intact (Apple menu is system-level and unaffected).
            use tauri::menu::{MenuBuilder, SubmenuBuilder};
            let app_submenu = SubmenuBuilder::new(app, "MindMap")
                .about(None)
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;
            let menu = MenuBuilder::new(app).item(&app_submenu).build()?;
            app.set_menu(menu)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
