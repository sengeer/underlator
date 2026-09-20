//! Порт хранилища чатов и корень пути адаптера.

use std::path::{Path, PathBuf};

use async_trait::async_trait;

use crate::domain::chat::dto::ChatData;
use crate::domain::error::CoreError;

/// Корень файлового (или иного) хранилища чатов.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StorageRoot(PathBuf);

impl StorageRoot {
    /// Создаёт корень по пути каталога.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self(path.into())
    }

    /// Путь корня как `Path`.
    pub fn as_path(&self) -> &Path {
        &self.0
    }
}

/// Persist чатов: сохранение, чтение, удаление и перечисление.
///
/// Use-cases зависят только от этого порта. Объектно-безопасен: `Arc<dyn ChatStore>`.
#[async_trait]
pub trait ChatStore: Send + Sync {
    /// Сохраняет полный снимок чата (создание или обновление).
    async fn save(&self, chat: &ChatData) -> Result<(), CoreError>;

    /// Загружает чат по идентификатору.
    async fn load(&self, id: &str) -> Result<ChatData, CoreError>;

    /// Удаляет чат. При `backup = true` адаптер может сохранить копию.
    async fn delete(&self, id: &str, backup: bool) -> Result<(), CoreError>;

    /// Возвращает полные снимки всех чатов (превью считает use-case).
    async fn list(&self) -> Result<Vec<ChatData>, CoreError>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    struct NoopStore;

    #[async_trait]
    impl ChatStore for NoopStore {
        async fn save(&self, _chat: &ChatData) -> Result<(), CoreError> {
            Ok(())
        }

        async fn load(&self, id: &str) -> Result<ChatData, CoreError> {
            Err(CoreError::NotFound {
                entity: "chat".to_owned(),
                id: id.to_owned(),
            })
        }

        async fn delete(&self, _id: &str, _backup: bool) -> Result<(), CoreError> {
            Ok(())
        }

        async fn list(&self) -> Result<Vec<ChatData>, CoreError> {
            Ok(Vec::new())
        }
    }

    #[test]
    fn arc_dyn_chat_store_compiles() {
        let store: Arc<dyn ChatStore> = Arc::new(NoopStore);
        let _ = store;
    }
}
