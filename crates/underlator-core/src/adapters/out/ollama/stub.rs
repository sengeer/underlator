//! Заготовки облачных провайдеров без исходящего HTTP.

use async_trait::async_trait;

use crate::domain::error::CoreError;
use crate::domain::events::{GenerateProgress, InstallProgress};
use crate::domain::model::dto::{
    GenerateRequest, InstallRequest, ListModelsResponse, RemoveRequest, UnarySuccess,
};

use crate::ports::{LlmProvider, ProviderStream};

/// Stub облачного провайдера: все операции кроме `stop` — unsupported.
pub struct UnsupportedProvider {
    id: String,
}

impl UnsupportedProvider {
    /// Создаёт stub с уже нормализованным идентификатором.
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }

    fn unsupported(&self, operation: &'static str) -> CoreError {
        CoreError::ProviderUnsupported {
            id: self.id.clone(),
            operation: operation.to_owned(),
        }
    }
}

#[async_trait]
impl LlmProvider for UnsupportedProvider {
    fn provider_id(&self) -> &str {
        &self.id
    }

    async fn generate_stream(
        &self,
        _request: &GenerateRequest,
    ) -> Result<ProviderStream<GenerateProgress>, CoreError> {
        Err(self.unsupported("generate_stream"))
    }

    async fn stop(&self) -> Result<(), CoreError> {
        Ok(())
    }

    async fn list_models(&self) -> Result<ListModelsResponse, CoreError> {
        Err(self.unsupported("list_models"))
    }

    async fn install_model(
        &self,
        _request: &InstallRequest,
    ) -> Result<ProviderStream<InstallProgress>, CoreError> {
        Err(self.unsupported("install_model"))
    }

    async fn remove_model(&self, _request: &RemoveRequest) -> Result<UnarySuccess, CoreError> {
        Err(self.unsupported("remove_model"))
    }
}
