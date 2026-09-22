//! Composition root host: один [`AppState`] на процесс.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use underlator_core::{
    CatalogService, ChatService, FilesystemChatStore, HttpCatalogLibrary, ModelService,
    ProviderFactoryConfig, StorageRoot, create_provider,
};

use crate::config::DesktopConfig;
use crate::error::HostError;

/// Состояние процесса: три сервиса ядра на одном провайдере.
#[derive(Clone)]
pub struct AppState {
    /// Use-cases `model` на одном `Arc<dyn LlmProvider>`.
    pub model: ModelService,
    /// Use-cases каталога.
    pub catalog: Arc<CatalogService>,
    /// Use-cases чата.
    pub chat: Arc<ChatService>,
    /// Фактический корень данных (для тестов / диагностики).
    pub data_dir: PathBuf,
}

impl AppState {
    /// Собирает состояние из уже созданных сервисов (тесты с mock).
    pub fn new(
        model: ModelService,
        catalog: Arc<CatalogService>,
        chat: Arc<ChatService>,
        data_dir: PathBuf,
    ) -> Self {
        Self {
            model,
            catalog,
            chat,
            data_dir,
        }
    }

    /// Wiring на старте: factory один раз, filesystem store, library HTTP ядра.
    ///
    /// `data_dir` — app data dir или явный override из конфига.
    pub fn from_config(config: &DesktopConfig, data_dir: &Path) -> Result<Self, HostError> {
        std::fs::create_dir_all(data_dir).map_err(|err| {
            HostError::internal(format!("каталог данных {}: {err}", data_dir.display()))
        })?;
        let boxed = create_provider(&ProviderFactoryConfig {
            provider: config.provider.clone(),
            allow_cloud: false,
        })
        .map_err(HostError::from)?;
        let provider: Arc<dyn underlator_core::LlmProvider> = Arc::from(boxed);
        let model = ModelService::new(Arc::clone(&provider));
        let library = Arc::new(HttpCatalogLibrary::new().map_err(HostError::from)?);
        let catalog = Arc::new(CatalogService::new(provider, library));
        let store = FilesystemChatStore::new(StorageRoot::new(data_dir));
        let chat = Arc::new(ChatService::new(Arc::new(store)));
        Ok(Self::new(model, catalog, chat, data_dir.to_path_buf()))
    }

    /// Выбирает каталог данных: override из конфига или переданный app data dir.
    pub fn resolve_data_dir(config: &DesktopConfig, app_data_dir: PathBuf) -> PathBuf {
        config
            .data_dir_override
            .clone()
            .unwrap_or(app_data_dir)
    }
}
