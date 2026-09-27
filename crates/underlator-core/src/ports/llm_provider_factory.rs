//! Порт создания LLM-провайдера по `id`/`url` (без привязки к adapters).

use std::sync::Arc;

use crate::domain::error::CoreError;
use crate::ports::LlmProvider;

/// Фабрика краткоживущих провайдеров для manage-models с override URL.
///
/// Реализация живёт в `adapters/out`; application зависит только от этого порта.
pub trait LlmProviderFactory: Send + Sync {
    /// Создаёт провайдера для `provider_id` и base URL.
    fn create(&self, provider_id: &str, url: &str) -> Result<Arc<dyn LlmProvider>, CoreError>;
}
