//! Порт хранилища чатов и корень файлового адаптера.

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use async_trait::async_trait;

use crate::chat::dto::ChatData;
use crate::error::CoreError;

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

/// In-memory `ChatStore` на `HashMap` — для тестов use-cases без диска.
#[derive(Clone, Default)]
pub struct MemoryChatStore {
    inner: Arc<Mutex<std::collections::HashMap<String, ChatData>>>,
}

impl MemoryChatStore {
    /// Пустое хранилище в памяти.
    pub fn new() -> Self {
        Self::default()
    }

    fn map(
        &self,
    ) -> Result<std::sync::MutexGuard<'_, std::collections::HashMap<String, ChatData>>, CoreError>
    {
        self.inner.lock().map_err(|_| CoreError::Storage {
            message: "блокировка MemoryChatStore отравлена".to_owned(),
        })
    }
}

#[async_trait]
impl ChatStore for MemoryChatStore {
    async fn save(&self, chat: &ChatData) -> Result<(), CoreError> {
        self.map()?.insert(chat.id.clone(), chat.clone());
        Ok(())
    }

    async fn load(&self, id: &str) -> Result<ChatData, CoreError> {
        self.map()?
            .get(id)
            .cloned()
            .ok_or_else(|| CoreError::NotFound {
                entity: "chat".to_owned(),
                id: id.to_owned(),
            })
    }

    async fn delete(&self, id: &str, _backup: bool) -> Result<(), CoreError> {
        self.map()?
            .remove(id)
            .map(|_| ())
            .ok_or_else(|| CoreError::NotFound {
                entity: "chat".to_owned(),
                id: id.to_owned(),
            })
    }

    async fn list(&self) -> Result<Vec<ChatData>, CoreError> {
        Ok(self.map()?.values().cloned().collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chat::dto::{ChatMessage, ChatMessageRole, ChatModelRef};

    fn sample(id: &str, title: &str) -> ChatData {
        ChatData {
            id: id.to_owned(),
            title: title.to_owned(),
            messages: vec![ChatMessage {
                id: "m1".to_owned(),
                role: ChatMessageRole::User,
                content: "привет".to_owned(),
                timestamp: "2026-01-01T00:00:00.000Z".to_owned(),
                model: None,
                context: None,
                metadata: None,
            }],
            created_at: "2026-01-01T00:00:00.000Z".to_owned(),
            updated_at: "2026-01-01T00:00:00.000Z".to_owned(),
            default_model: ChatModelRef {
                name: "llama".to_owned(),
                version: None,
                provider: Some("ollama".to_owned()),
            },
            context: None,
            metadata: None,
        }
    }

    #[tokio::test]
    async fn memory_store_roundtrip_without_disk() {
        let store = MemoryChatStore::new();
        let chat = sample("c1", "Чат");
        store.save(&chat).await.expect("save");
        let loaded = store.load("c1").await.expect("load");
        assert_eq!(loaded.id, "c1");
        assert_eq!(loaded.title, "Чат");
        let listed = store.list().await.expect("list");
        assert_eq!(listed.len(), 1);
        store.delete("c1", false).await.expect("delete");
        assert!(store.list().await.expect("list empty").is_empty());
    }

    #[tokio::test]
    async fn memory_store_unknown_id_is_not_found() {
        let store = MemoryChatStore::new();
        let err = store.load("missing").await.expect_err("not found");
        match err {
            CoreError::NotFound { entity, id } => {
                assert_eq!(entity, "chat");
                assert_eq!(id, "missing");
            }
            other => panic!("ожидался NotFound, получено {other:?}"),
        }
    }

    #[test]
    fn arc_dyn_chat_store_compiles() {
        let store: Arc<dyn ChatStore> = Arc::new(MemoryChatStore::new());
        let _ = store;
    }
}
