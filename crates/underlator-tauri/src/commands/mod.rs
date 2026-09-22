//! MVP Tauri commands: thin parse → application API → serialize/emit.
//!
//! Логика без `#[tauri::command]` доступна без feature `desktop` для unit-тестов.

/// Команды поверхности `model`.
pub mod model;
/// Команды поверхности `catalog`.
pub mod catalog;
/// Команды поверхности `chat`.
pub mod chat;

/// Список имён 14 MVP commands (сверка с картой ядра / TS).
pub const MVP_COMMAND_NAMES: &[&str] = &[
    "model_generate",
    "model_stop",
    "model_install",
    "model_remove",
    "model_list",
    "catalog_get",
    "catalog_search",
    "catalog_get_model_info",
    "chat_create",
    "chat_get",
    "chat_update",
    "chat_delete",
    "chat_list",
    "chat_add_message",
];

#[cfg(test)]
mod tests {
    use super::MVP_COMMAND_NAMES;
    use underlator_core::operations;

    #[test]
    fn mvp_names_match_core_tauri_commands() {
        let from_core: Vec<&str> = operations().iter().map(|op| op.tauri_command).collect();
        assert_eq!(from_core, MVP_COMMAND_NAMES);
        assert_eq!(MVP_COMMAND_NAMES.len(), 14);
        assert!(!MVP_COMMAND_NAMES.iter().any(|n| n.starts_with("rag")));
        assert!(!MVP_COMMAND_NAMES.iter().any(|n| n.starts_with("splash")));
    }
}
