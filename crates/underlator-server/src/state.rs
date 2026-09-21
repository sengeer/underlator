//! Composition root host: один `AppState` на процесс, без factory на запрос.

use std::path::PathBuf;
use std::sync::Arc;

use underlator_core::{
    CatalogService, ChatService, FilesystemChatStore, HttpCatalogLibrary, ModelService,
    ProviderFactoryConfig, StorageRoot, create_provider,
};

use crate::config::{ConfigError, ServerConfig};

/// Ошибка старта host (конфиг, IO, ядро).
#[derive(Debug)]
pub enum StartupError {
    /// Нарушена политика bind.
    Config(ConfigError),
    /// Ошибка ядра при wiring (`create_provider`, library HTTP-клиент).
    Core(underlator_core::CoreError),
    /// Не удалось создать каталог данных.
    Io(std::io::Error),
}

impl std::fmt::Display for StartupError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Config(err) => write!(f, "{err}"),
            Self::Core(err) => write!(f, "{err}"),
            Self::Io(err) => write!(f, "каталог данных: {err}"),
        }
    }
}

impl std::error::Error for StartupError {}

impl From<ConfigError> for StartupError {
    fn from(value: ConfigError) -> Self {
        Self::Config(value)
    }
}

impl From<underlator_core::CoreError> for StartupError {
    fn from(value: underlator_core::CoreError) -> Self {
        Self::Core(value)
    }
}

impl From<std::io::Error> for StartupError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

/// Состояние процесса: три сервиса ядра и параметры auth/static.
#[derive(Clone)]
pub struct AppState {
    /// Use-cases `model` на одном `Arc<dyn LlmProvider>`.
    pub model: ModelService,
    /// Use-cases каталога.
    pub catalog: Arc<CatalogService>,
    /// Use-cases чата.
    pub chat: Arc<ChatService>,
    auth_token: Option<String>,
    auth_user: Option<String>,
    auth_password: Option<String>,
    /// Каталог SPA; `None` — static middleware не подключается.
    pub static_dir: Option<PathBuf>,
}

impl AppState {
    /// Собирает состояние из уже созданных сервисов (тесты с mock).
    pub fn new(
        model: ModelService,
        catalog: Arc<CatalogService>,
        chat: Arc<ChatService>,
        config: &ServerConfig,
    ) -> Self {
        Self {
            model,
            catalog,
            chat,
            auth_token: config.auth_token.clone(),
            auth_user: config.auth_user.clone(),
            auth_password: config.auth_password.clone(),
            static_dir: config.static_dir.clone(),
        }
    }

    /// Wiring на старте: factory один раз, filesystem store, library HTTP ядра.
    pub fn from_config(config: &ServerConfig) -> Result<Self, StartupError> {
        std::fs::create_dir_all(&config.data_dir)?;
        let boxed = create_provider(&ProviderFactoryConfig {
            provider: config.provider.clone(),
            allow_cloud: false,
        })?;
        let provider: Arc<dyn underlator_core::LlmProvider> = Arc::from(boxed);
        let model = ModelService::new(Arc::clone(&provider));
        let library = Arc::new(HttpCatalogLibrary::new()?);
        let catalog = Arc::new(CatalogService::new(provider, library));
        let store = FilesystemChatStore::new(StorageRoot::new(&config.data_dir));
        let chat = Arc::new(ChatService::new(Arc::new(store)));
        Ok(Self::new(model, catalog, chat, config))
    }

    /// Включён ли auth middleware.
    pub fn auth_enabled(&self) -> bool {
        !self.auth_token().is_empty() || self.has_basic()
    }

    /// Bearer-токен или пустая строка, если не задан.
    pub(crate) fn auth_token(&self) -> &str {
        self.auth_token.as_deref().unwrap_or("")
    }

    /// Задана ли пара HTTP Basic.
    pub(crate) fn has_basic(&self) -> bool {
        !self.auth_user().is_empty() && !self.auth_password().is_empty()
    }

    /// Имя пользователя Basic или пустая строка.
    pub(crate) fn auth_user(&self) -> &str {
        self.auth_user.as_deref().unwrap_or("")
    }

    /// Пароль Basic или пустая строка.
    pub(crate) fn auth_password(&self) -> &str {
        self.auth_password.as_deref().unwrap_or("")
    }
}
