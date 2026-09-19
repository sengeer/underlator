//! DTO поверхности `chat`, зеркало типов `chat.ts` (доменный payload, не envelope).

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// Роль отправителя сообщения.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChatMessageRole {
    /// Сообщение пользователя.
    User,
    /// Ответ ассистента.
    Assistant,
    /// Системное сообщение.
    System,
}

/// Ссылка на модель в чате / сообщении.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatModelRef {
    /// Название модели.
    pub name: String,
    /// Версия модели.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    /// Провайдер модели.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
}

/// Настройки генерации чата.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GenerationSettings {
    /// Температура.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    /// Максимум токенов.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    /// Дополнительные параметры.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<Map<String, Value>>,
}

/// Контекст сообщения.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MessageContext {
    /// Идентификаторы предыдущих сообщений.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_messages: Option<Vec<String>>,
    /// Метаданные контекста.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

/// Сообщение чата (`ChatMessage`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChatMessage {
    /// Идентификатор сообщения.
    pub id: String,
    /// Роль отправителя.
    pub role: ChatMessageRole,
    /// Текст в Markdown.
    pub content: String,
    /// Временная метка.
    pub timestamp: String,
    /// Модель, сгенерировавшая ответ.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<ChatModelRef>,
    /// Контекст сообщения.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<MessageContext>,
    /// Метаданные сообщения.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

/// Контекст чата (системный промпт и настройки).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ChatContext {
    /// Системный промпт.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,
    /// Настройки генерации.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation_settings: Option<GenerationSettings>,
    /// Метаданные контекста.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

/// Полные данные чата (`ChatData`) — ответ create / get / update.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatData {
    /// Идентификатор чата.
    pub id: String,
    /// Заголовок.
    pub title: String,
    /// Сообщения.
    pub messages: Vec<ChatMessage>,
    /// Время создания.
    pub created_at: String,
    /// Время обновления.
    pub updated_at: String,
    /// Модель по умолчанию.
    pub default_model: ChatModelRef,
    /// Контекст чата.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<ChatContext>,
    /// Метаданные чата.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

/// Краткое превью последнего сообщения в списке.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatPreviewMessage {
    /// Роль отправителя.
    pub role: ChatMessageRole,
    /// Текст.
    pub content: String,
    /// Временная метка.
    pub timestamp: String,
}

/// Элемент списка чатов без полной истории (`ChatFile`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatFile {
    /// Идентификатор чата.
    pub id: String,
    /// Заголовок.
    pub title: String,
    /// Число сообщений.
    pub message_count: u64,
    /// Время создания.
    pub created_at: String,
    /// Время обновления.
    pub updated_at: String,
    /// Модель по умолчанию.
    pub default_model: ChatModelRef,
    /// Превью последнего сообщения.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_message: Option<ChatPreviewMessage>,
    /// Размер файла в байтах.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_size: Option<u64>,
    /// Файл заблокирован.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_locked: Option<bool>,
    /// Метаданные.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

/// Запрос создания чата.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChatRequest {
    /// Заголовок.
    pub title: String,
    /// Модель по умолчанию.
    pub default_model: ChatModelRef,
    /// Системный промпт.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,
    /// Настройки генерации.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation_settings: Option<GenerationSettings>,
    /// Метаданные.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

/// Запрос чтения чата.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetChatRequest {
    /// Идентификатор чата.
    pub chat_id: String,
    /// Включить сообщения.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_messages: Option<bool>,
    /// Лимит сообщений.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_limit: Option<u32>,
    /// Смещение сообщений.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_offset: Option<u32>,
}

/// Запрос обновления чата.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChatRequest {
    /// Идентификатор чата.
    pub chat_id: String,
    /// Новый заголовок.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// Новая модель по умолчанию.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_model: Option<ChatModelRef>,
    /// Новый системный промпт.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,
    /// Новые настройки генерации.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation_settings: Option<GenerationSettings>,
    /// Метаданные.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

/// Запрос удаления чата.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteChatRequest {
    /// Идентификатор чата.
    pub chat_id: String,
    /// Создать резервную копию.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub create_backup: Option<bool>,
    /// Подтверждение удаления.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confirmed: Option<bool>,
}

/// Поле сортировки списка чатов.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ChatListSortBy {
    /// По дате создания.
    CreatedAt,
    /// По дате обновления.
    UpdatedAt,
    /// По заголовку.
    Title,
    /// По числу сообщений.
    MessageCount,
}

/// Порядок сортировки списка.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortOrder {
    /// По возрастанию.
    Asc,
    /// По убыванию.
    Desc,
}

/// Запрос списка чатов.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ListChatsRequest {
    /// Лимит.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    /// Смещение.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<u32>,
    /// Созданы после.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_after: Option<String>,
    /// Созданы до.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_before: Option<String>,
    /// Обновлены после.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_after: Option<String>,
    /// Обновлены до.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_before: Option<String>,
    /// Поиск по заголовку.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub search_query: Option<String>,
    /// Фильтр по модели.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_filter: Option<String>,
    /// Поле сортировки.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_by: Option<ChatListSortBy>,
    /// Порядок сортировки.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<SortOrder>,
}

/// Запрос добавления сообщения.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddMessageRequest {
    /// Идентификатор чата.
    pub chat_id: String,
    /// Роль отправителя.
    pub role: ChatMessageRole,
    /// Текст сообщения.
    pub content: String,
    /// Модель (для ответов ассистента).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<ChatModelRef>,
    /// Контекст.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<MessageContext>,
    /// Метаданные.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

/// Ответ удаления: `{ deletedChatId }`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteChatResponse {
    /// Идентификатор удалённого чата.
    pub deleted_chat_id: String,
}

/// Пагинация списка чатов.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
    /// Текущая страница.
    pub page: u32,
    /// Размер страницы.
    pub page_size: u32,
    /// Всего страниц.
    pub total_pages: u32,
    /// Есть следующая страница.
    pub has_next: bool,
    /// Есть предыдущая страница.
    pub has_previous: bool,
}

/// Ответ списка: `{ chats, totalCount, pagination }`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListChatsResponse {
    /// Элементы без полной истории сообщений.
    pub chats: Vec<ChatFile>,
    /// Общее число чатов.
    pub total_count: u64,
    /// Пагинация.
    pub pagination: Pagination,
}

/// Ответ `addMessage`: `{ message, updatedChat }`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddMessageResponse {
    /// Новое сообщение.
    pub message: ChatMessage,
    /// Обновлённый чат.
    pub updated_chat: ChatData,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    fn roundtrip<T>(value: &T) -> Value
    where
        T: Serialize + serde::de::DeserializeOwned + PartialEq + std::fmt::Debug,
    {
        let json = serde_json::to_value(value).expect("сериализация");
        let back: T = serde_json::from_value(json.clone()).expect("десериализация");
        assert_eq!(value, &back);
        json
    }

    fn model_ref() -> ChatModelRef {
        ChatModelRef {
            name: "llama".to_owned(),
            version: None,
            provider: None,
        }
    }

    fn sample_message() -> ChatMessage {
        ChatMessage {
            id: "m1".to_owned(),
            role: ChatMessageRole::User,
            content: "привет".to_owned(),
            timestamp: "2026-01-01T00:00:00Z".to_owned(),
            model: None,
            context: None,
            metadata: None,
        }
    }

    fn sample_chat() -> ChatData {
        ChatData {
            id: "c1".to_owned(),
            title: "Чат".to_owned(),
            messages: vec![sample_message()],
            created_at: "2026-01-01T00:00:00Z".to_owned(),
            updated_at: "2026-01-02T00:00:00Z".to_owned(),
            default_model: model_ref(),
            context: None,
            metadata: None,
        }
    }

    #[test]
    fn chat_dto_json_keys_roundtrip() {
        let get = GetChatRequest {
            chat_id: "c1".to_owned(),
            include_messages: Some(true),
            message_limit: None,
            message_offset: None,
        };
        let get_json = roundtrip(&get);
        assert!(get_json.get("chatId").is_some(), "ожидался ключ chatId");

        let chat_json = roundtrip(&sample_chat());
        assert!(
            chat_json.get("createdAt").is_some(),
            "ожидался ключ createdAt"
        );
        assert!(
            chat_json.get("defaultModel").is_some(),
            "ожидался ключ defaultModel"
        );

        let deleted = DeleteChatResponse {
            deleted_chat_id: "c1".to_owned(),
        };
        let deleted_json = roundtrip(&deleted);
        assert!(
            deleted_json.get("deletedChatId").is_some(),
            "ожидался ключ deletedChatId"
        );
    }

    #[test]
    fn chat_list_and_add_message_payloads_roundtrip() {
        let list = ListChatsResponse {
            chats: vec![ChatFile {
                id: "c1".to_owned(),
                title: "Чат".to_owned(),
                message_count: 1,
                created_at: "2026-01-01T00:00:00Z".to_owned(),
                updated_at: "2026-01-02T00:00:00Z".to_owned(),
                default_model: model_ref(),
                last_message: None,
                file_size: None,
                is_locked: None,
                metadata: None,
            }],
            total_count: 1,
            pagination: Pagination {
                page: 1,
                page_size: 20,
                total_pages: 1,
                has_next: false,
                has_previous: false,
            },
        };
        let list_json = roundtrip(&list);
        assert!(list_json.get("chats").is_some());
        assert!(list_json.get("totalCount").is_some());
        assert!(list_json.get("pagination").is_some());

        let added = AddMessageResponse {
            message: sample_message(),
            updated_chat: sample_chat(),
        };
        let added_json = roundtrip(&added);
        assert!(added_json.get("message").is_some());
        assert!(added_json.get("updatedChat").is_some());
    }

    #[test]
    fn create_request_has_title_and_default_model() {
        let req = CreateChatRequest {
            title: "Новый".to_owned(),
            default_model: model_ref(),
            system_prompt: None,
            generation_settings: None,
            metadata: None,
        };
        let json = roundtrip(&req);
        assert_eq!(json["title"], "Новый");
        assert_eq!(json["defaultModel"]["name"], "llama");
    }
}
