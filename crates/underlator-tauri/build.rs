//! Генерация контекста Tauri только при feature `desktop`.

fn main() {
    #[cfg(feature = "desktop")]
    {
        tauri_build::build();
    }
}
