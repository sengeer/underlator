//! Карта имён MVP API: IPC → use-case → HTTP path → Tauri command.
//!
//! Не содержит `rag.*` и `splash.*`. Черновик HTTP path атом 3.1 может
//! уточнить, не меняя идентификатор use-case.

/// Описание одной MVP-операции.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ContractOp {
    /// Имя Electron IPC.
    pub ipc: &'static str,
    /// Стабильный идентификатор use-case в core.
    pub use_case: &'static str,
    /// HTTP-метод черновика маршрута.
    pub http_method: &'static str,
    /// Черновик HTTP-пути.
    pub http_path: &'static str,
    /// Черновик имени Tauri command.
    pub tauri_command: &'static str,
}

/// Описание progress-события.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ContractEvent {
    /// Имя Electron IPC-события.
    pub ipc_event: &'static str,
    /// Идентификатор события в core.
    pub core_name: &'static str,
}

const OPERATIONS: [ContractOp; 14] = [
    ContractOp {
        ipc: "model:generate",
        use_case: "model::generate_stream",
        http_method: "POST",
        http_path: "/api/model/generate",
        tauri_command: "model_generate",
    },
    ContractOp {
        ipc: "model:stop",
        use_case: "model::stop",
        http_method: "POST",
        http_path: "/api/model/stop",
        tauri_command: "model_stop",
    },
    ContractOp {
        ipc: "model:install",
        use_case: "model::install",
        http_method: "POST",
        http_path: "/api/model/install",
        tauri_command: "model_install",
    },
    ContractOp {
        ipc: "model:remove",
        use_case: "model::remove",
        http_method: "POST",
        http_path: "/api/model/remove",
        tauri_command: "model_remove",
    },
    ContractOp {
        ipc: "model:list",
        use_case: "model::list",
        http_method: "GET",
        http_path: "/api/model/list",
        tauri_command: "model_list",
    },
    ContractOp {
        ipc: "catalog:get",
        use_case: "catalog::get",
        http_method: "GET",
        http_path: "/api/catalog",
        tauri_command: "catalog_get",
    },
    ContractOp {
        ipc: "catalog:search",
        use_case: "catalog::search",
        http_method: "POST",
        http_path: "/api/catalog/search",
        tauri_command: "catalog_search",
    },
    ContractOp {
        ipc: "catalog:get-model-info",
        use_case: "catalog::get_model_info",
        http_method: "GET",
        http_path: "/api/catalog/models/:name",
        tauri_command: "catalog_get_model_info",
    },
    ContractOp {
        ipc: "chat:create",
        use_case: "chat::create",
        http_method: "POST",
        http_path: "/api/chat",
        tauri_command: "chat_create",
    },
    ContractOp {
        ipc: "chat:get",
        use_case: "chat::get",
        http_method: "GET",
        http_path: "/api/chat/:id",
        tauri_command: "chat_get",
    },
    ContractOp {
        ipc: "chat:update",
        use_case: "chat::update",
        http_method: "PATCH",
        http_path: "/api/chat/:id",
        tauri_command: "chat_update",
    },
    ContractOp {
        ipc: "chat:delete",
        use_case: "chat::delete",
        http_method: "DELETE",
        http_path: "/api/chat/:id",
        tauri_command: "chat_delete",
    },
    ContractOp {
        ipc: "chat:list",
        use_case: "chat::list",
        http_method: "GET",
        http_path: "/api/chat",
        tauri_command: "chat_list",
    },
    ContractOp {
        ipc: "chat:add-message",
        use_case: "chat::add_message",
        http_method: "POST",
        http_path: "/api/chat/:id/messages",
        tauri_command: "chat_add_message",
    },
];

const EVENTS: [ContractEvent; 2] = [
    ContractEvent {
        ipc_event: "model:generate-progress",
        core_name: crate::events::GENERATE_PROGRESS_CORE_NAME,
    },
    ContractEvent {
        ipc_event: "model:install-progress",
        core_name: crate::events::INSTALL_PROGRESS_CORE_NAME,
    },
];

/// IPC-имена всех MVP-операций (14 штук).
pub const MVP_IPC_OPERATIONS: [&str; 14] = [
    "model:generate",
    "model:stop",
    "model:install",
    "model:remove",
    "model:list",
    "catalog:get",
    "catalog:search",
    "catalog:get-model-info",
    "chat:create",
    "chat:get",
    "chat:update",
    "chat:delete",
    "chat:list",
    "chat:add-message",
];

/// IPC-имена progress-событий MVP.
pub const MVP_IPC_EVENTS: [&str; 2] = ["model:generate-progress", "model:install-progress"];

/// Все MVP-операции карты имён.
pub fn operations() -> &'static [ContractOp] {
    &OPERATIONS
}

/// Все progress-события карты имён.
pub fn events() -> &'static [ContractEvent] {
    &EVENTS
}

/// Возвращает идентификатор use-case для IPC-имени операции.
pub fn use_case_for_ipc(ipc: &str) -> Option<&'static str> {
    OPERATIONS
        .iter()
        .find(|op| op.ipc == ipc)
        .map(|op| op.use_case)
}

/// Возвращает операцию по IPC-имени.
pub fn operation_by_ipc(ipc: &str) -> Option<&'static ContractOp> {
    OPERATIONS.iter().find(|op| op.ipc == ipc)
}

/// Возвращает событие по IPC-имени.
pub fn event_by_ipc(ipc_event: &str) -> Option<&'static ContractEvent> {
    EVENTS.iter().find(|event| event.ipc_event == ipc_event)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn each_mvp_ipc_resolves_to_exactly_one_use_case() {
        assert_eq!(operations().len(), 14);
        let mut seen_ipc = HashSet::new();
        let mut seen_use_case = HashSet::new();
        for ipc in MVP_IPC_OPERATIONS {
            let matches: Vec<_> = operations().iter().filter(|op| op.ipc == ipc).collect();
            assert_eq!(
                matches.len(),
                1,
                "IPC {ipc} должен резолвиться ровно один раз"
            );
            let use_case = matches[0].use_case;
            assert_eq!(use_case_for_ipc(ipc), Some(use_case));
            assert!(seen_ipc.insert(ipc), "дубликат IPC {ipc}");
            assert!(
                seen_use_case.insert(use_case),
                "дубликат use-case {use_case}"
            );
        }
        assert_eq!(seen_ipc.len(), operations().len());
    }

    #[test]
    fn http_paths_live_under_mvp_prefixes() {
        for op in operations() {
            let ok = op.http_path.starts_with("/api/model")
                || op.http_path.starts_with("/api/catalog")
                || op.http_path.starts_with("/api/chat");
            assert!(ok, "неожиданный path {} для {}", op.http_path, op.ipc);
        }
    }

    #[test]
    fn events_cover_generate_and_install_progress() {
        assert_eq!(events().len(), 2);
        for ipc in MVP_IPC_EVENTS {
            let event = event_by_ipc(ipc).unwrap_or_else(|| panic!("нет события {ipc}"));
            assert_eq!(event.ipc_event, ipc);
        }
        assert_eq!(
            event_by_ipc("model:generate-progress").map(|e| e.core_name),
            Some("events::generate_progress")
        );
        assert_eq!(
            event_by_ipc("model:install-progress").map(|e| e.core_name),
            Some("events::install_progress")
        );
    }

    #[test]
    fn naming_map_excludes_rag_and_splash() {
        for op in operations() {
            assert!(!op.ipc.starts_with("rag:"), "{}", op.ipc);
            assert!(!op.ipc.starts_with("splash:"), "{}", op.ipc);
        }
        for event in events() {
            assert!(!event.ipc_event.starts_with("rag:"));
            assert!(!event.ipc_event.starts_with("splash:"));
        }
        assert!(use_case_for_ipc("rag:query-documents").is_none());
        assert!(use_case_for_ipc("splash:get-status").is_none());
    }
}
