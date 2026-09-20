//! Ядро Underlator: общая логика dual-mode backend.
//!
//! Crate **не** зависит от `tauri`, `axum` и Electron. Host-слои
//! (`underlator-server`, `underlator-tauri`) — driving adapters: разбор входа
//! → вызов application/ports API → сериализация/emit.
//!
//! Атом 2.4: гексагональная раскладка `domain` / `ports` / `application` /
//! `adapters/out`. Этот файл — composition root (`pub use` и wiring factory
//! провайдера в исходящем адаптерном слое, не в `application`).

#![warn(missing_docs)]

/// Исходящие адаптеры (HTTP, Ollama, filesystem/memory, library HTTP).
pub mod adapters;
/// Use-cases MVP; зависят только от ports и domain.
pub mod application;
/// Доменный слой: DTO, события, ошибки, без IO.
pub mod domain;
/// Исходящие порты (traits).
pub mod ports;

pub use adapters::out::http::{
    HttpAuth, HttpByteStream, HttpClient, HttpClientConfig, HttpMethod, HttpRequest, RetryPolicy,
    StreamMode, user_agent,
};
pub use adapters::out::ollama::{
    OllamaProvider, ProviderFactoryConfig, UnsupportedProvider, create_provider,
};
pub use adapters::out::{FilesystemChatStore, HttpCatalogLibrary, MemoryChatStore};
pub use application::{
    CatalogService, ChatService, Clock, IdGenerator, ModelService, SystemClock, TickClock,
    UuidIdGenerator,
};
pub use domain::catalog::{
    CatalogFilters, CatalogModelType, CatalogSortBy, CompatibilityStatus, GetCatalogRequest,
    GetModelInfoRequest, GetModelInfoResult, ModelCatalog, ModelStatus, OllamaModelInfo,
    static_library_models,
};
pub use domain::chat::{
    AddMessageRequest, AddMessageResponse, ChatContext, ChatData, ChatFile, ChatListSortBy,
    ChatMessage, ChatMessageRole, ChatModelRef, ChatPreviewMessage, CreateChatRequest,
    DeleteChatRequest, DeleteChatResponse, GenerationSettings, GetChatRequest, ListChatsRequest,
    ListChatsResponse, MessageContext, Pagination, UpdateChatRequest,
};
pub use domain::contract::{
    ContractEvent, ContractOp, MVP_IPC_EVENTS, MVP_IPC_OPERATIONS, event_by_ipc,
    events as contract_events, operation_by_ipc, operations, use_case_for_ipc,
};
pub use domain::events::{
    CoreEvent, GENERATE_PROGRESS_CORE_NAME, GENERATE_PROGRESS_EVENT, GenerateProgress,
    INSTALL_PROGRESS_CORE_NAME, INSTALL_PROGRESS_EVENT, InstallProgress, InstallStatus,
};
pub use domain::model::{
    DEFAULT_PROVIDER_ID, DEFAULT_PROVIDER_URL, GenerateRequest, GenerateResult, InstallRequest,
    ListModelsRequest, ListModelsResponse, OllamaModel, OllamaModelDetails, ProviderConfig,
    RemoveRequest, StopRequest, UnarySuccess,
};
pub use domain::{CoreError, HostErrorClass, host_error_class, rag, splash};
pub use ports::{CatalogLibrary, ChatStore, LlmProvider, ProviderStream, StorageRoot};

/// Имя crate ядра.
pub const CRATE_NAME: &str = env!("CARGO_PKG_NAME");

/// Версия crate ядра.
pub const CRATE_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Снимок каркаса для smoke-сериализации.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct ScaffoldInfo {
    /// Имя crate.
    pub name: String,
    /// Версия crate.
    pub version: String,
}

impl ScaffoldInfo {
    /// Текущие имя и версия ядра.
    pub fn current() -> Self {
        Self {
            name: CRATE_NAME.to_owned(),
            version: CRATE_VERSION.to_owned(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crate_identity() {
        assert_eq!(CRATE_NAME, "underlator-core");
        assert!(!CRATE_VERSION.is_empty());
    }

    #[test]
    fn scaffold_info_json_roundtrip() {
        let info = ScaffoldInfo::current();
        let json = serde_json::to_string(&info).expect("сериализация");
        let back: ScaffoldInfo = serde_json::from_str(&json).expect("десериализация");
        assert_eq!(info, back);
    }
}
