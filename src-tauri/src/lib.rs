// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Mutex;
use tauri::menu::{MenuId, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager, WindowEvent};

/// Shared handles to all localizable menu items.
struct AppMenuItems {
    // Submenus
    file_submenu: Submenu<tauri::Wry>,
    edit_submenu: Submenu<tauri::Wry>,
    // File items
    file_new: tauri::menu::MenuItem<tauri::Wry>,
    file_open: tauri::menu::MenuItem<tauri::Wry>,
    file_save: tauri::menu::MenuItem<tauri::Wry>,
    file_save_as: tauri::menu::MenuItem<tauri::Wry>,
    // Edit — predefined
    edit_undo: PredefinedMenuItem<tauri::Wry>,
    edit_redo: PredefinedMenuItem<tauri::Wry>,
    edit_cut: PredefinedMenuItem<tauri::Wry>,
    edit_copy: PredefinedMenuItem<tauri::Wry>,
    edit_paste: PredefinedMenuItem<tauri::Wry>,
    edit_select_all: PredefinedMenuItem<tauri::Wry>,
    // Edit — node actions
    edit_add_child: tauri::menu::MenuItem<tauri::Wry>,
    edit_add_sibling: tauri::menu::MenuItem<tauri::Wry>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Called by the frontend after the user confirms it is safe to close.
#[tauri::command]
fn force_close(window: tauri::Window) {
    window.destroy().ok();
}

/// Called by the frontend whenever the selected node changes.
#[tauri::command]
fn set_node_menu_enabled(enabled: bool, state: tauri::State<'_, Mutex<AppMenuItems>>) {
    if let Ok(items) = state.lock() {
        items.edit_add_child.set_enabled(enabled).ok();
        items.edit_add_sibling.set_enabled(enabled).ok();
    }
}

/// Called by the frontend on startup and on every locale toggle.
/// Updates all custom menu item labels to match the current language.
#[tauri::command]
fn update_menu_labels(locale: String, state: tauri::State<'_, Mutex<AppMenuItems>>) {
    let zh = locale == "zh";
    if let Ok(items) = state.lock() {
        // Submenus
        items
            .file_submenu
            .set_text(if zh { "文件" } else { "File" })
            .ok();
        items
            .edit_submenu
            .set_text(if zh { "编辑" } else { "Edit" })
            .ok();
        // File items
        items
            .file_new
            .set_text(if zh { "新建" } else { "New" })
            .ok();
        items
            .file_open
            .set_text(if zh { "打开…" } else { "Open…" })
            .ok();
        items
            .file_save
            .set_text(if zh { "保存" } else { "Save" })
            .ok();
        items
            .file_save_as
            .set_text(if zh { "另存为…" } else { "Save As…" })
            .ok();
        // Edit — predefined
        items
            .edit_undo
            .set_text(if zh { "撤销" } else { "Undo" })
            .ok();
        items
            .edit_redo
            .set_text(if zh { "重做" } else { "Redo" })
            .ok();
        items
            .edit_cut
            .set_text(if zh { "剪切" } else { "Cut" })
            .ok();
        items
            .edit_copy
            .set_text(if zh { "复制" } else { "Copy" })
            .ok();
        items
            .edit_paste
            .set_text(if zh { "粘贴" } else { "Paste" })
            .ok();
        items
            .edit_select_all
            .set_text(if zh { "全选" } else { "Select All" })
            .ok();
        // Edit — node actions
        items
            .edit_add_child
            .set_text(if zh {
                "新建子节点"
            } else {
                "Add Child Node"
            })
            .ok();
        items
            .edit_add_sibling
            .set_text(if zh {
                "新建兄弟节点"
            } else {
                "Add Sibling Node"
            })
            .ok();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            force_close,
            set_node_menu_enabled,
            update_menu_labels,
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                window.emit("close-requested", ()).ok();
            }
        })
        .setup(|app| {
            use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

            // ── MindMap menu ──────────────────────────────────────────────────
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

            // ── File menu ─────────────────────────────────────────────────────
            let file_new = MenuItemBuilder::new("新建")
                .id("file-new")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;
            let file_open = MenuItemBuilder::new("打开…")
                .id("file-open")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let file_save = MenuItemBuilder::new("保存")
                .id("file-save")
                .accelerator("CmdOrCtrl+S")
                .build(app)?;
            let file_save_as = MenuItemBuilder::new("另存为…")
                .id("file-save-as")
                .accelerator("CmdOrCtrl+Shift+S")
                .build(app)?;

            let file_submenu = SubmenuBuilder::new(app, "文件")
                .item(&file_new)
                .item(&file_open)
                .separator()
                .item(&file_save)
                .item(&file_save_as)
                .build()?;

            // ── Edit menu ─────────────────────────────────────────────────────
            let edit_undo = PredefinedMenuItem::undo(app, Some("撤销"))?;
            let edit_redo = PredefinedMenuItem::redo(app, Some("重做"))?;
            let edit_cut = PredefinedMenuItem::cut(app, Some("剪切"))?;
            let edit_copy = PredefinedMenuItem::copy(app, Some("复制"))?;
            let edit_paste = PredefinedMenuItem::paste(app, Some("粘贴"))?;
            let edit_select_all = PredefinedMenuItem::select_all(app, Some("全选"))?;

            let edit_add_child = MenuItemBuilder::new("新建子节点")
                .id("edit-add-child")
                .accelerator("Tab")
                .enabled(false)
                .build(app)?;
            let edit_add_sibling = MenuItemBuilder::new("新建兄弟节点")
                .id("edit-add-sibling")
                .accelerator("Enter")
                .enabled(false)
                .build(app)?;

            let edit_submenu = SubmenuBuilder::new(app, "编辑")
                .item(&edit_undo)
                .item(&edit_redo)
                .separator()
                .item(&edit_cut)
                .item(&edit_copy)
                .item(&edit_paste)
                .item(&edit_select_all)
                .separator()
                .item(&edit_add_child)
                .item(&edit_add_sibling)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_submenu)
                .item(&file_submenu)
                .item(&edit_submenu)
                .build()?;
            app.set_menu(menu)?;

            // Store handles for runtime updates.
            app.manage(Mutex::new(AppMenuItems {
                file_submenu,
                edit_submenu,
                file_new,
                file_open,
                file_save,
                file_save_as,
                edit_undo,
                edit_redo,
                edit_cut,
                edit_copy,
                edit_paste,
                edit_select_all,
                edit_add_child,
                edit_add_sibling,
            }));

            // Forward menu click events to the frontend.
            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                let id: &MenuId = event.id();
                if let Some(window) = app_handle.get_webview_window("main") {
                    match id.as_ref() {
                        "quit" => {
                            window.emit("close-requested", ()).ok();
                        }
                        "file-new" => {
                            window.emit("menu-file-new", ()).ok();
                        }
                        "file-open" => {
                            window.emit("menu-file-open", ()).ok();
                        }
                        "file-save" => {
                            window.emit("menu-file-save", ()).ok();
                        }
                        "file-save-as" => {
                            window.emit("menu-file-save-as", ()).ok();
                        }
                        "edit-add-child" => {
                            window.emit("menu-edit-add-child", ()).ok();
                        }
                        "edit-add-sibling" => {
                            window.emit("menu-edit-add-sibling", ()).ok();
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
