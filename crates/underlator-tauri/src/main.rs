//! Точка входа desktop-host (`underlator-tauri`).

fn main() {
    // До любого GTK/WebKit/EGL: NVIDIA/Wayland quirks.
    #[cfg(all(feature = "desktop", target_os = "linux"))]
    underlator_tauri::apply_linux_webview_workarounds();

    underlator_tauri::run();
}
