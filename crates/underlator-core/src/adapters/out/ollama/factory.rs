//! Реестр / factory LLM-провайдеров по `provider_id`.

use std::sync::Arc;

use crate::domain::error::CoreError;
use crate::domain::model::dto::ProviderConfig;
use crate::ports::{LlmProvider, LlmProviderFactory};

use super::config::{ProviderFactoryConfig, is_cloud_stub, is_local_ollama, normalize_provider_id};
use super::provider::OllamaProvider;
use super::stub::UnsupportedProvider;

/// Создаёт провайдера по конфигу. Сеть не используется до первой операции.
///
/// `ollama` и `embedded-ollama` → runtime-адаптер Ollama.
/// `openrouter` / `anthropic` → stub, только при `allow_cloud`.
/// Неизвестный id → [`CoreError::ProviderUnknown`].
pub fn create_provider(config: &ProviderFactoryConfig) -> Result<Box<dyn LlmProvider>, CoreError> {
    let id = normalize_provider_id(&config.provider.id);
    if is_local_ollama(&id) {
        let provider = OllamaProvider::from_url(id, &config.provider.url)?;
        return Ok(Box::new(provider));
    }
    if is_cloud_stub(&id) {
        if !config.allow_cloud {
            return Err(CoreError::ProviderCloudDisabled { id });
        }
        return Ok(Box::new(UnsupportedProvider::new(id)));
    }
    Err(CoreError::ProviderUnknown { id })
}

/// Адаптер порта [`LlmProviderFactory`]: делегирует в [`create_provider`].
#[derive(Debug, Default, Clone, Copy)]
pub struct CoreLlmProviderFactory {
    /// Opt-in на облачные stubs (по умолчанию выключен).
    pub allow_cloud: bool,
}

impl CoreLlmProviderFactory {
    /// Фабрика без облачных stubs.
    pub fn new() -> Self {
        Self::default()
    }
}

impl LlmProviderFactory for CoreLlmProviderFactory {
    fn create(&self, provider_id: &str, url: &str) -> Result<Arc<dyn LlmProvider>, CoreError> {
        let boxed = create_provider(&ProviderFactoryConfig {
            provider: ProviderConfig {
                id: provider_id.to_owned(),
                url: url.to_owned(),
            },
            allow_cloud: self.allow_cloud,
        })?;
        Ok(Arc::from(boxed))
    }
}
