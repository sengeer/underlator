//! Filesystem-backed `ChatStore`: `{root}/chats/{id}.chat.json`.

use std::fs;
use std::path::{Path, PathBuf};

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::domain::chat::dto::{
    ChatContext, ChatData, ChatMessage, ChatMessageRole, ChatModelRef, GenerationSettings,
    MessageContext,
};
use crate::domain::error::CoreError;
use crate::ports::{ChatStore, StorageRoot};

/// Версия ондиск-формата, совместимая с Electron `CHAT_VERSION`.
const CHAT_FILE_VERSION: &str = "0.1.0";

/// Файловое хранилище чатов под [`StorageRoot`].
pub struct FilesystemChatStore {
    root: StorageRoot,
}

impl FilesystemChatStore {
    /// Создаёт адаптер. Каталоги создаются при первой записи.
    pub fn new(root: StorageRoot) -> Self {
        Self { root }
    }

    fn chats_dir(&self) -> PathBuf {
        self.root.as_path().join("chats")
    }

    fn backup_dir(&self) -> PathBuf {
        self.chats_dir().join("backup")
    }

    fn chat_path(&self, id: &str) -> Result<PathBuf, CoreError> {
        validate_chat_id(id)?;
        Ok(self.chats_dir().join(format!("{id}.chat.json")))
    }

    fn tmp_path(&self, id: &str) -> Result<PathBuf, CoreError> {
        validate_chat_id(id)?;
        Ok(self.chats_dir().join(format!("{id}.chat.json.tmp")))
    }

    fn write_atomic(&self, id: &str, json: &str) -> Result<(), CoreError> {
        let dir = self.chats_dir();
        fs::create_dir_all(&dir)
            .map_err(|err| storage(format!("не удалось создать {dir:?}: {err}")))?;
        let tmp = self.tmp_path(id)?;
        let dest = self.chat_path(id)?;
        fs::write(&tmp, json)
            .map_err(|err| storage(format!("не удалось записать {tmp:?}: {err}")))?;
        fs::rename(&tmp, &dest).map_err(|err| {
            let _ = fs::remove_file(&tmp);
            storage(format!("не удалось заменить {dest:?}: {err}"))
        })
    }
}

#[async_trait]
impl ChatStore for FilesystemChatStore {
    async fn save(&self, chat: &ChatData) -> Result<(), CoreError> {
        let file = ChatFileDocument::from_chat(chat);
        let json = serde_json::to_string_pretty(&file)
            .map_err(|err| storage(format!("не удалось сериализовать чат: {err}")))?;
        self.write_atomic(&chat.id, &json)
    }

    async fn load(&self, id: &str) -> Result<ChatData, CoreError> {
        let path = self.chat_path(id)?;
        read_chat_file(&path, id)
    }

    async fn delete(&self, id: &str, backup: bool) -> Result<(), CoreError> {
        let path = self.chat_path(id)?;
        if !path.is_file() {
            return Err(CoreError::NotFound {
                entity: "chat".to_owned(),
                id: id.to_owned(),
            });
        }
        if backup {
            let backup_dir = self.backup_dir();
            fs::create_dir_all(&backup_dir)
                .map_err(|err| storage(format!("не удалось создать backup: {err}")))?;
            let backup_path = backup_dir.join(format!("{id}.chat.json"));
            fs::copy(&path, &backup_path)
                .map_err(|err| storage(format!("не удалось скопировать backup: {err}")))?;
        }
        fs::remove_file(&path).map_err(|err| storage(format!("не удалось удалить {path:?}: {err}")))
    }

    async fn list(&self) -> Result<Vec<ChatData>, CoreError> {
        let dir = self.chats_dir();
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let entries = fs::read_dir(&dir)
            .map_err(|err| storage(format!("не удалось прочитать {dir:?}: {err}")))?;
        let mut chats = Vec::new();
        for entry in entries {
            let entry =
                entry.map_err(|err| storage(format!("ошибка записи каталога чатов: {err}")))?;
            let path = entry.path();
            if path.is_dir() {
                continue;
            }
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if !name.ends_with(".chat.json") || name.ends_with(".chat.json.tmp") {
                continue;
            }
            let stem = name.trim_end_matches(".chat.json");
            match read_chat_file(&path, stem) {
                Ok(chat) => chats.push(chat),
                Err(CoreError::NotFound { .. }) => {}
                Err(err) => {
                    tracing::warn!(path = %path.display(), error = %err, "пропуск повреждённого файла чата");
                }
            }
        }
        Ok(chats)
    }
}

fn read_chat_file(path: &Path, id: &str) -> Result<ChatData, CoreError> {
    let bytes = fs::read(path).map_err(|err| {
        if err.kind() == std::io::ErrorKind::NotFound {
            CoreError::NotFound {
                entity: "chat".to_owned(),
                id: id.to_owned(),
            }
        } else {
            storage(format!("не удалось прочитать {path:?}: {err}"))
        }
    })?;
    let file: ChatFileDocument = serde_json::from_slice(&bytes)
        .map_err(|err| storage(format!("некорректный JSON чата {path:?}: {err}")))?;
    Ok(file.into_chat())
}

fn validate_chat_id(id: &str) -> Result<(), CoreError> {
    if id.is_empty()
        || id.contains('/')
        || id.contains('\\')
        || id.contains("..")
        || id.contains('\0')
    {
        return Err(CoreError::Validation {
            message: "некорректный идентификатор чата".to_owned(),
        });
    }
    Ok(())
}

fn storage(message: String) -> CoreError {
    CoreError::Storage { message }
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatFileDocument {
    version: String,
    metadata: ChatFileMetadata,
    #[serde(default)]
    messages: Vec<ChatFileMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatFileMetadata {
    id: String,
    title: String,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    settings: ChatFileSettings,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatFileSettings {
    model: String,
    provider: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    parameters: Option<Map<String, Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatFileMessage {
    id: String,
    #[serde(rename = "type")]
    message_type: ChatMessageRole,
    content: String,
    timestamp: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    metadata: Option<Map<String, Value>>,
}

impl ChatFileDocument {
    fn from_chat(chat: &ChatData) -> Self {
        let mut parameters = chat.metadata.clone().unwrap_or_default();
        if let Some(version) = &chat.default_model.version {
            parameters.insert("version".to_owned(), Value::String(version.clone()));
        }
        if let Some(ctx) = &chat.context {
            if let Some(prompt) = &ctx.system_prompt {
                parameters.insert("systemPrompt".to_owned(), Value::String(prompt.clone()));
            }
            if let Some(settings) = &ctx.generation_settings
                && let Ok(value) = serde_json::to_value(settings)
            {
                parameters.insert("generationSettings".to_owned(), value);
            }
        }
        let parameters = if parameters.is_empty() {
            None
        } else {
            Some(parameters)
        };
        Self {
            version: CHAT_FILE_VERSION.to_owned(),
            metadata: ChatFileMetadata {
                id: chat.id.clone(),
                title: chat.title.clone(),
                created_at: chat.created_at.clone(),
                updated_at: chat.updated_at.clone(),
                settings: ChatFileSettings {
                    model: chat.default_model.name.clone(),
                    provider: chat
                        .default_model
                        .provider
                        .clone()
                        .unwrap_or_else(|| "ollama".to_owned()),
                    parameters,
                },
            },
            messages: chat
                .messages
                .iter()
                .map(ChatFileMessage::from_message)
                .collect(),
        }
    }

    fn into_chat(self) -> ChatData {
        let params = self.metadata.settings.parameters.clone();
        let version = params
            .as_ref()
            .and_then(|m| m.get("version"))
            .and_then(Value::as_str)
            .map(str::to_owned);
        let system_prompt = params
            .as_ref()
            .and_then(|m| m.get("systemPrompt"))
            .and_then(Value::as_str)
            .map(str::to_owned);
        let generation_settings = params.as_ref().and_then(|m| {
            m.get("generationSettings")
                .cloned()
                .and_then(|v| serde_json::from_value::<GenerationSettings>(v).ok())
        });
        let context =
            if system_prompt.is_some() || generation_settings.is_some() || params.is_some() {
                Some(ChatContext {
                    system_prompt,
                    generation_settings,
                    metadata: params.clone(),
                })
            } else {
                None
            };
        ChatData {
            id: self.metadata.id,
            title: self.metadata.title,
            messages: self
                .messages
                .into_iter()
                .map(ChatFileMessage::into_message)
                .collect(),
            created_at: self.metadata.created_at,
            updated_at: self.metadata.updated_at,
            default_model: ChatModelRef {
                name: self.metadata.settings.model,
                version,
                provider: Some(self.metadata.settings.provider),
            },
            context,
            metadata: params,
        }
    }
}

impl ChatFileMessage {
    fn from_message(msg: &ChatMessage) -> Self {
        let mut metadata = msg.metadata.clone().unwrap_or_default();
        if let Some(model) = &msg.model
            && let Ok(value) = serde_json::to_value(model)
        {
            metadata.insert("model".to_owned(), value);
        }
        if let Some(ctx) = &msg.context
            && let Ok(value) = serde_json::to_value(ctx)
        {
            metadata.insert("context".to_owned(), value);
        }
        Self {
            id: msg.id.clone(),
            message_type: msg.role,
            content: msg.content.clone(),
            timestamp: msg.timestamp.clone(),
            metadata: if metadata.is_empty() {
                None
            } else {
                Some(metadata)
            },
        }
    }

    fn into_message(self) -> ChatMessage {
        let mut metadata = self.metadata.unwrap_or_default();
        let model = metadata
            .remove("model")
            .and_then(|v| serde_json::from_value::<ChatModelRef>(v).ok());
        let context = metadata
            .remove("context")
            .and_then(|v| serde_json::from_value::<MessageContext>(v).ok());
        ChatMessage {
            id: self.id,
            role: self.message_type,
            content: self.content,
            timestamp: self.timestamp,
            model,
            context,
            metadata: if metadata.is_empty() {
                None
            } else {
                Some(metadata)
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::chat::dto::ChatMessage;

    fn sample(id: &str) -> ChatData {
        ChatData {
            id: id.to_owned(),
            title: "Черновик".to_owned(),
            messages: vec![ChatMessage {
                id: "msg_1".to_owned(),
                role: ChatMessageRole::User,
                content: "привет".to_owned(),
                timestamp: "2026-01-01T00:00:00.000Z".to_owned(),
                model: None,
                context: None,
                metadata: None,
            }],
            created_at: "2026-01-01T00:00:00.000Z".to_owned(),
            updated_at: "2026-01-02T00:00:00.000Z".to_owned(),
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
    async fn filesystem_roundtrip_writes_chat_json() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = FilesystemChatStore::new(StorageRoot::new(dir.path()));
        let chat = sample("chat_1");
        store.save(&chat).await.expect("save");
        let path = dir.path().join("chats").join("chat_1.chat.json");
        assert!(path.is_file(), "ожидался файл {}", path.display());
        let loaded = store.load("chat_1").await.expect("load");
        assert_eq!(loaded.id, chat.id);
        assert_eq!(loaded.title, chat.title);
        assert_eq!(loaded.messages.len(), 1);
        assert_eq!(loaded.messages[0].role, ChatMessageRole::User);
        assert_eq!(loaded.messages[0].content, "привет");
        assert_eq!(loaded.default_model.name, "llama");
    }

    #[tokio::test]
    async fn leftover_tmp_does_not_replace_committed_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = FilesystemChatStore::new(StorageRoot::new(dir.path()));
        store.save(&sample("chat_1")).await.expect("save v1");
        let tmp = dir.path().join("chats").join("chat_1.chat.json.tmp");
        fs::write(&tmp, "{not-json").expect("torn tmp");
        let loaded = store.load("chat_1").await.expect("previous version");
        assert_eq!(loaded.title, "Черновик");
    }

    #[tokio::test]
    async fn delete_with_backup_keeps_copy() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = FilesystemChatStore::new(StorageRoot::new(dir.path()));
        store.save(&sample("chat_1")).await.expect("save");
        store.delete("chat_1", true).await.expect("delete");
        assert!(store.list().await.expect("list").is_empty());
        let backup = dir
            .path()
            .join("chats")
            .join("backup")
            .join("chat_1.chat.json");
        assert!(backup.is_file(), "ожидалась копия {}", backup.display());
    }
}
