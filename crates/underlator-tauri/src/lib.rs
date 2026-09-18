//! Desktop-host Underlator (Tauri 2): тонкий адаптер над `underlator-core`.
//!
//! Полноценный runtime (`wry` / WebKit) включается feature `desktop`.
//! Без него crate остаётся `cargo check`-friendly каркасом.
//! Бизнес-логика и MVP API здесь не реализуются.

#![warn(missing_docs)]

use underlator_core::CRATE_NAME;

/// Запускает desktop-host.
///
/// С feature `desktop` поднимает Tauri 2; иначе пишет диагностику каркаса.
pub fn run() {
    #[cfg(feature = "desktop")]
    run_tauri();

    #[cfg(not(feature = "desktop"))]
    run_scaffold_stub();
}

#[cfg(feature = "desktop")]
fn run_tauri() {
    tracing::info!(core = CRATE_NAME, "запуск Tauri 2 host");
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("ошибка runtime Tauri");
}

#[cfg(not(feature = "desktop"))]
fn run_scaffold_stub() {
    tracing::warn!(
        core = CRATE_NAME,
        "underlator-tauri: feature `desktop` выключена (нужны GTK/WebKit для Tauri 2)"
    );
}

#[cfg(test)]
mod tests {
    #[test]
    fn host_depends_on_core() {
        assert_eq!(underlator_core::CRATE_NAME, "underlator-core");
    }
}
