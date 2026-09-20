//! Порт LLM-провайдера: операции generate/stop/list/install/remove.

use std::pin::Pin;

use async_trait::async_trait;
use futures_util::Stream;

use crate::domain::error::CoreError;
use crate::domain::events::{GenerateProgress, InstallProgress};
use crate::domain::model::dto::{
    GenerateRequest, InstallRequest, ListModelsResponse, RemoveRequest, UnarySuccess,
};

/// Поток результатов операции провайдера.
pub type ProviderStream<T> = Pin<Box<dyn Stream<Item = Result<T, CoreError>> + Send>>;

/// Абстракция LLM-провайдера без вендорных HTTP-путей.
///
/// Объектно-безопасен: `Box<dyn LlmProvider>`.
#[async_trait]
pub trait LlmProvider: Send + Sync {
    /// Нормализованный идентификатор провайдера для трассировки.
    fn provider_id(&self) -> &str;

    /// Потоковая генерация: инкрементальные chunk с `response` и `done`.
    async fn generate_stream(
        &self,
        request: &GenerateRequest,
    ) -> Result<ProviderStream<GenerateProgress>, CoreError>;

    /// Останавливает активную генерацию. Нет активной операции — `Ok(())`.
    async fn stop(&self) -> Result<(), CoreError>;

    /// Список локальных моделей провайдера.
    async fn list_models(&self) -> Result<ListModelsResponse, CoreError>;

    /// Установка модели с потоком прогресса.
    async fn install_model(
        &self,
        request: &InstallRequest,
    ) -> Result<ProviderStream<InstallProgress>, CoreError>;

    /// Удаление модели.
    async fn remove_model(&self, request: &RemoveRequest) -> Result<UnarySuccess, CoreError>;
}
