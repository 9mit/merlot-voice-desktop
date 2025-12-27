use tauri::Emitter;

#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(desktop)]
use tauri_plugin_clipboard_manager::ClipboardExt;

#[cfg(desktop)]
use enigo::{Enigo, Key, Keyboard, Settings};

/// Injects text into the currently focused text input by:
/// 1. Writing text to clipboard
/// 2. Simulating Ctrl+V paste
#[tauri::command]
fn inject_text(app: tauri::AppHandle, text: String) -> Result<(), String> {
    #[cfg(desktop)]
    {
        println!("inject_text called with: {}", text);
        
        // Write to clipboard
        app.clipboard()
            .write_text(text)
            .map_err(|e| format!("Failed to write to clipboard: {}", e))?;

        // Small delay to ensure clipboard is ready
        std::thread::sleep(std::time::Duration::from_millis(100));

        // Simulate Ctrl+V paste
        let mut enigo = Enigo::new(&Settings::default())
            .map_err(|e| format!("Failed to create Enigo: {}", e))?;

        enigo
            .key(Key::Control, enigo::Direction::Press)
            .map_err(|e| format!("Failed to press Ctrl: {}", e))?;
        enigo
            .key(Key::Unicode('v'), enigo::Direction::Click)
            .map_err(|e| format!("Failed to press V: {}", e))?;
        enigo
            .key(Key::Control, enigo::Direction::Release)
            .map_err(|e| format!("Failed to release Ctrl: {}", e))?;

        println!("inject_text completed successfully");
        Ok(())
    }

    #[cfg(not(desktop))]
    {
        let _ = (app, text);
        Err("inject_text is only available on desktop".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .setup(|app| {
            println!("=== Merlot Voice Starting ===");
            
            #[cfg(desktop)]
            {
                // Initialize clipboard plugin
                println!("Initializing clipboard plugin...");
                app.handle().plugin(tauri_plugin_clipboard_manager::init())?;
                println!("Clipboard plugin initialized");

                // Get app handle for event emission
                let app_handle_press = app.handle().clone();
                let app_handle_release = app.handle().clone();

                // Define Alt+G as the push-to-talk hotkey
                let ptt_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyG);
                let ptt_shortcut_clone = ptt_shortcut.clone();
                
                println!("Setting up global shortcut plugin with Alt+G...");

                // Initialize global shortcut plugin with handler
                let plugin = tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |_app, shortcut, event| {
                        println!("Shortcut event received: {:?}", shortcut);
                        if shortcut == &ptt_shortcut_clone {
                            match event.state() {
                                ShortcutState::Pressed => {
                                    println!(">>> PTT: Alt+G PRESSED - Starting recording");
                                    if let Err(e) = app_handle_press.emit("ptt-start", ()) {
                                        println!("Error emitting ptt-start: {}", e);
                                    }
                                }
                                ShortcutState::Released => {
                                    println!(">>> PTT: Alt+G RELEASED - Stopping recording");
                                    if let Err(e) = app_handle_release.emit("ptt-stop", ()) {
                                        println!("Error emitting ptt-stop: {}", e);
                                    }
                                }
                            }
                        }
                    })
                    .build();
                    
                app.handle().plugin(plugin)?;
                println!("Global shortcut plugin initialized");

                // Register the shortcut
                println!("Registering shortcut: Alt+G");
                match app.global_shortcut().register(ptt_shortcut) {
                    Ok(_) => println!("=== SUCCESS: Alt+G shortcut registered! Hold Alt+G to record ==="),
                    Err(e) => println!("=== ERROR: Failed to register shortcut: {} ===", e),
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![inject_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
