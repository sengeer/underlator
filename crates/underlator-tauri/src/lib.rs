//! Desktop-host Underlator (Tauri 2): **driving adapter** над `underlator-core`.
//!
//! Полноценный runtime (`wry` / WebKit) включается feature `desktop`.
//! Без него crate остаётся `cargo check`-friendly: wiring, thin handlers и
//! unit-тесты без WebView. Разбор IPC → application/ports API ядра → emit.
//! Доменные правила и исходящий HTTP к LLM здесь не реализуются.

#![warn(missing_docs)]

pub mod commands;
pub mod config;
pub mod error;
pub mod state;
pub mod stubs;

use underlator_core::CRATE_NAME;

/// Запускает desktop-host.
///
/// С feature `desktop` поднимает Tauri 2 с MVP commands; иначе пишет диагностику.
pub fn run() {
    #[cfg(feature = "desktop")]
    run_tauri();

    #[cfg(not(feature = "desktop"))]
    run_scaffold_stub();
}

#[cfg(feature = "desktop")]
fn run_tauri() {
    use tauri::Manager;

    use crate::commands::{catalog, chat, model};
    use crate::config::DesktopConfig;
    use crate::state::AppState;

    tracing::info!(core = CRATE_NAME, "запуск Tauri 2 host (MVP commands)");
    tauri::Builder::default()
        .setup(|app| {
            let config = DesktopConfig::from_env();
            let app_data = app
                .path()
                .app_data_dir()
                .map_err(|err| format!("app data dir: {err}"))?;
            let data_dir = AppState::resolve_data_dir(&config, app_data);
            let state = AppState::from_config(&config, &data_dir)
                .map_err(|err| format!("wiring AppState: {err}"))?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            model::model_generate,
            model::model_stop,
            model::model_install,
            model::model_remove,
            model::model_list,
            catalog::catalog_get,
            catalog::catalog_search,
            catalog::catalog_get_model_info,
            chat::chat_create,
            chat::chat_get,
            chat::chat_update,
            chat::chat_delete,
            chat::chat_list,
            chat::chat_add_message,
        ])
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

    #[test]
    fn host_sources_have_no_direct_ollama_http() {
        let roots = [
            include_str!("config.rs"),
            include_str!("state.rs"),
            include_str!("error.rs"),
            include_str!("stubs.rs"),
            include_str!("commands/mod.rs"),
            include_str!("commands/model.rs"),
            include_str!("commands/catalog.rs"),
            include_str!("commands/chat.rs"),
        ];
        // Скан без forbidden-токенов в исходниках (gate core 2.2/5.1).
        let http_crate = format!("{}{}::", "req", "west");
        let generate_path = format!("/api/{}", "generate");
        for src in roots {
            assert!(
                !src.contains(&http_crate),
                "host не должен тянуть LLM HTTP-клиент"
            );
            assert!(
                !src.contains(&generate_path),
                "host не должен хардкодить Ollama generate path"
            );
        }
    }
}
