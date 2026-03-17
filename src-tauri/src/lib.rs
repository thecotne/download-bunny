#[cfg(target_os = "macos")]
#[tauri::command]
fn set_file_comment(path: String, comment: String) {
    // Embed quote characters safely inside AppleScript string literals.
    let path_esc = path.replace('"', "\" & quote & \"");
    let comment_esc = comment.replace('"', "\" & quote & \"");
    let script = format!(
        "tell application \"Finder\" to set comment of (POSIX file \"{path_esc}\" as alias) to \"{comment_esc}\""
    );
    let _ = std::process::Command::new("osascript")
        .args(["-e", &script])
        .output();
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn set_file_comment(path: String, comment: String) {
    use windows::{
        core::{HSTRING, PROPVARIANT},
        Win32::{
            System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED},
            UI::Shell::PropertiesSystem::{
                IPropertyStore, PSGetPropertyKeyFromName, PROPERTYKEY,
                SHGetPropertyStoreFromParsingName, GPS_READWRITE,
            },
        },
    };
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let wide_path = HSTRING::from(path.as_str());
        let store: IPropertyStore = match SHGetPropertyStoreFromParsingName(
            &wide_path, None, GPS_READWRITE,
        ) {
            Ok(s) => s,
            Err(_) => return,
        };
        let mut pkey = PROPERTYKEY::default();
        if PSGetPropertyKeyFromName(windows::core::w!("System.Comment"), &mut pkey).is_err() {
            return;
        }
        let pv = PROPVARIANT::from(comment.as_str());
        let _ = store.SetValue(&pkey, &pv);
        let _ = store.Commit();
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
#[tauri::command]
fn set_file_comment(_path: String, _comment: String) {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // macOS app bundles launch with a minimal PATH that excludes Homebrew.
    // Prepend common Homebrew locations so yt-dlp and ffmpeg are found.
    #[cfg(target_os = "macos")]
    {
        let path = std::env::var("PATH").unwrap_or_default();
        std::env::set_var(
            "PATH",
            format!("/opt/homebrew/bin:/usr/local/bin:{}", path),
        );
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![set_file_comment])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
