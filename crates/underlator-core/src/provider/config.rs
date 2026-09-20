//! Конфигурация factory LLM-провайдеров.

use crate::model::dto::ProviderConfig;

/// Идентификатор локального Ollama.
pub(crate) const ID_OLLAMA: &str = "ollama";
/// Идентификатор embedded Ollama (тот же HTTP-адаптер; splash вне скоупа).
pub(crate) const ID_EMBEDDED_OLLAMA: &str = "embedded-ollama";
/// Заготовка OpenRouter (stub).
pub(crate) const ID_OPENROUTER: &str = "openrouter";
/// Заготовка Anthropic (stub).
pub(crate) const ID_ANTHROPIC: &str = "anthropic";

/// Данные для создания провайдера: DTO `id`/`url` и флаг облачного opt-in.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderFactoryConfig {
    /// Конфиг провайдера, совместимый с `ElectronApiConfig`.
    pub provider: ProviderConfig,
    /// Явный opt-in на облачные stubs (`openrouter`, `anthropic`). По умолчанию выключен.
    pub allow_cloud: bool,
}

impl Default for ProviderFactoryConfig {
    fn default() -> Self {
        Self {
            provider: ProviderConfig::default(),
            allow_cloud: false,
        }
    }
}

/// Нормализует `provider_id`: trim + lowercase.
pub(crate) fn normalize_provider_id(id: &str) -> String {
    id.trim().to_ascii_lowercase()
}

pub(crate) fn is_local_ollama(id: &str) -> bool {
    id == ID_OLLAMA || id == ID_EMBEDDED_OLLAMA
}

pub(crate) fn is_cloud_stub(id: &str) -> bool {
    id == ID_OPENROUTER || id == ID_ANTHROPIC
}
