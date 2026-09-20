//! Реестр / factory LLM-провайдеров по `provider_id`.

use crate::domain::error::CoreError;

use super::config::{ProviderFactoryConfig, is_cloud_stub, is_local_ollama, normalize_provider_id};
use super::provider::OllamaProvider;
use super::stub::UnsupportedProvider;
use crate::ports::LlmProvider;

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
