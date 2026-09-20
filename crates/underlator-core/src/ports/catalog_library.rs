//! Порт источника библиотеки моделей (без HTTP-адаптера).

use async_trait::async_trait;

use crate::domain::catalog::dto::OllamaModelInfo;
use crate::domain::error::CoreError;

/// Источник карточек библиотеки моделей.
#[async_trait]
pub trait CatalogLibrary: Send + Sync {
    /// Загружает карточки библиотеки. Ошибка сети/разбора — на совести вызывающего.
    async fn fetch_models(&self) -> Result<Vec<OllamaModelInfo>, CoreError>;
}
