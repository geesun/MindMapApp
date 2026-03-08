// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Emitter, Manager, WindowEvent};

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
            // On macOS: build the app menu manually so that Cmd+Q / Quit goes through
            // our unsaved-changes guard instead of terminating the process directly.
            // We replace the built-in .quit() item with a custom "Quit MindMap" item
            // that emits "close-requested" to the frontend.
            use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

            let quit_item = MenuItemBuilder::new("Quit MindMap")
                .id("quit")
                .accelerator("CmdOrCtrl+Q")
                .build(app)?;

            let app_submenu = SubmenuBuilder::new(app, "MindMap")
                .about(None)
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .item(&quit_item)
                .build()?;

            let menu = MenuBuilder::new(app).item(&app_submenu).build()?;
            app.set_menu(menu)?;

            // When the custom Quit item is clicked, emit close-requested to the
            // main window so the frontend's unsaved-changes guard runs.
            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                if event.id() == "quit" {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        window.emit("close-requested", ()).ok();
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
