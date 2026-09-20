//! Use-cases поверхности `chat`: CRUD и `addMessage` через [`ChatStore`].

use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use crate::chat::dto::{
    AddMessageRequest, AddMessageResponse, ChatContext, ChatData, ChatFile, ChatListSortBy,
    ChatMessage, ChatPreviewMessage, CreateChatRequest, DeleteChatRequest, DeleteChatResponse,
    GetChatRequest, ListChatsRequest, ListChatsResponse, Pagination, SortOrder, UpdateChatRequest,
};
use crate::chat::store::ChatStore;
use crate::error::CoreError;
use crate::iso8601::{millis_to_iso8601, unix_millis_now};

/// Источник времени для ISO-8601 и префикса идентификаторов.
pub trait Clock: Send + Sync {
    /// Unix-время в миллисекундах.
    fn unix_millis(&self) -> u64;
}

/// Системные часы.
pub struct SystemClock;

impl Clock for SystemClock {
    fn unix_millis(&self) -> u64 {
        unix_millis_now()
    }
}

/// Генератор идентификаторов `chat_…` / `msg_…`.
pub trait IdGenerator: Send + Sync {
    /// Идентификатор чата: `chat_{millis}_{32hex}`.
    fn chat_id(&self, millis: u64) -> String;
    /// Идентификатор сообщения: `msg_{millis}_{32hex}`.
    fn message_id(&self, millis: u64) -> String;
}

/// Генератор на `uuid` v4 (32 hex-символа без дефисов).
pub struct UuidIdGenerator;

impl IdGenerator for UuidIdGenerator {
    fn chat_id(&self, millis: u64) -> String {
        format!("chat_{millis}_{}", uuid::Uuid::new_v4().simple())
    }

    fn message_id(&self, millis: u64) -> String {
        format!("msg_{millis}_{}", uuid::Uuid::new_v4().simple())
    }
}

/// Исполняемые use-cases чата. Persist только через [`ChatStore`].
pub struct ChatService {
    store: Arc<dyn ChatStore>,
    clock: Arc<dyn Clock>,
    ids: Arc<dyn IdGenerator>,
}

impl ChatService {
    /// Собирает сервис с системными часами и UUID.
    pub fn new(store: Arc<dyn ChatStore>) -> Self {
        Self::with_deps(store, Arc::new(SystemClock), Arc::new(UuidIdGenerator))
    }

    /// Собирает сервис с подменяемыми часами и генератором ID (тесты).
    pub fn with_deps(
        store: Arc<dyn ChatStore>,
        clock: Arc<dyn Clock>,
        ids: Arc<dyn IdGenerator>,
    ) -> Self {
        Self { store, clock, ids }
    }

    /// Создаёт чат с пустой историей сообщений.
    pub async fn create(&self, request: CreateChatRequest) -> Result<ChatData, CoreError> {
        if request.title.trim().is_empty() {
            return Err(CoreError::Validation {
                message: "title обязателен".to_owned(),
            });
        }
        if request.default_model.name.trim().is_empty() {
            return Err(CoreError::Validation {
                message: "defaultModel.name обязателен".to_owned(),
            });
        }
        let millis = self.clock.unix_millis();
        let now = millis_to_iso8601(millis);
        let provider = request
            .default_model
            .provider
            .clone()
            .filter(|p| !p.is_empty())
            .unwrap_or_else(|| "ollama".to_owned());
        let context = context_from_create(&request);
        let mut default_model = request.default_model;
        default_model.provider = Some(provider);
        let chat = ChatData {
            id: self.ids.chat_id(millis),
            title: request.title,
            messages: Vec::new(),
            created_at: now.clone(),
            updated_at: now,
            default_model,
            context,
            metadata: request.metadata,
        };
        self.store.save(&chat).await?;
        Ok(chat)
    }

    /// Возвращает чат; опционально скрывает или обрезает сообщения.
    pub async fn get(&self, request: GetChatRequest) -> Result<ChatData, CoreError> {
        if request.chat_id.trim().is_empty() {
            return Err(CoreError::Validation {
                message: "chatId обязателен".to_owned(),
            });
        }
        let mut chat = self.store.load(&request.chat_id).await?;
        if request.include_messages == Some(false) {
            chat.messages.clear();
        } else {
            apply_message_window(
                &mut chat.messages,
                request.message_limit,
                request.message_offset,
            );
        }
        Ok(chat)
    }

    /// Частично обновляет поля чата и поднимает `updatedAt`.
    pub async fn update(&self, request: UpdateChatRequest) -> Result<ChatData, CoreError> {
        if request.chat_id.trim().is_empty() {
            return Err(CoreError::Validation {
                message: "chatId обязателен".to_owned(),
            });
        }
        if let Some(title) = &request.title
            && title.trim().is_empty()
        {
            return Err(CoreError::Validation {
                message: "title не может быть пустым".to_owned(),
            });
        }
        let mut chat = self.store.load(&request.chat_id).await?;
        if let Some(title) = request.title {
            chat.title = title;
        }
        if let Some(model) = request.default_model {
            let mut model = model;
            if model.provider.as_deref().unwrap_or("").is_empty() {
                model.provider = Some("ollama".to_owned());
            }
            chat.default_model = model;
        }
        if request.system_prompt.is_some() || request.generation_settings.is_some() {
            let mut ctx = chat.context.take().unwrap_or_default();
            if let Some(prompt) = request.system_prompt {
                ctx.system_prompt = Some(prompt);
            }
            if let Some(settings) = request.generation_settings {
                ctx.generation_settings = Some(settings);
            }
            chat.context = Some(ctx);
        }
        if let Some(metadata) = request.metadata {
            chat.metadata = Some(metadata);
        }
        chat.updated_at = millis_to_iso8601(self.clock.unix_millis());
        self.store.save(&chat).await?;
        Ok(chat)
    }

    /// Удаляет чат только при `confirmed = true`.
    pub async fn delete(
        &self,
        request: DeleteChatRequest,
    ) -> Result<DeleteChatResponse, CoreError> {
        if request.chat_id.trim().is_empty() {
            return Err(CoreError::Validation {
                message: "chatId обязателен".to_owned(),
            });
        }
        if request.confirmed != Some(true) {
            return Err(CoreError::DeleteNotConfirmed);
        }
        let _ = self.store.load(&request.chat_id).await?;
        self.store
            .delete(&request.chat_id, request.create_backup.unwrap_or(false))
            .await?;
        Ok(DeleteChatResponse {
            deleted_chat_id: request.chat_id,
        })
    }

    /// Список кратких записей с фильтрами, сортировкой и пагинацией.
    pub async fn list(&self, request: ListChatsRequest) -> Result<ListChatsResponse, CoreError> {
        let mut files: Vec<ChatFile> = self
            .store
            .list()
            .await?
            .into_iter()
            .map(chat_to_file)
            .collect();
        files.retain(|chat| matches_list_filters(chat, &request));
        sort_chat_files(&mut files, request.sort_by, request.sort_order);
        let total_count = files.len() as u64;
        let limit = request.limit.unwrap_or(50);
        let offset = request.offset.unwrap_or(0);
        let page_size = limit.max(1);
        let start = (offset as usize).min(files.len());
        let end = start.saturating_add(limit as usize).min(files.len());
        files = files.drain(start..end).collect();
        Ok(ListChatsResponse {
            chats: files,
            total_count,
            pagination: pagination_info(total_count, page_size, offset),
        })
    }

    /// Добавляет сообщение в конец истории.
    pub async fn add_message(
        &self,
        request: AddMessageRequest,
    ) -> Result<AddMessageResponse, CoreError> {
        if request.chat_id.trim().is_empty() {
            return Err(CoreError::Validation {
                message: "chatId обязателен".to_owned(),
            });
        }
        if request.content.trim().is_empty() {
            return Err(CoreError::Validation {
                message: "content обязателен".to_owned(),
            });
        }
        let mut chat = self.store.load(&request.chat_id).await?;
        let millis = self.clock.unix_millis();
        let now = millis_to_iso8601(millis);
        let message = ChatMessage {
            id: self.ids.message_id(millis),
            role: request.role,
            content: request.content,
            timestamp: now.clone(),
            model: request.model,
            context: request.context,
            metadata: request.metadata,
        };
        chat.messages.push(message.clone());
        chat.updated_at = now;
        self.store.save(&chat).await?;
        Ok(AddMessageResponse {
            message,
            updated_chat: chat,
        })
    }
}

fn context_from_create(request: &CreateChatRequest) -> Option<ChatContext> {
    if request.system_prompt.is_none() && request.generation_settings.is_none() {
        return None;
    }
    Some(ChatContext {
        system_prompt: request.system_prompt.clone(),
        generation_settings: request.generation_settings.clone(),
        metadata: None,
    })
}

fn apply_message_window(messages: &mut Vec<ChatMessage>, limit: Option<u32>, offset: Option<u32>) {
    if limit.is_none() && offset.is_none() {
        return;
    }
    let start = offset.unwrap_or(0) as usize;
    let len = messages.len();
    let start = start.min(len);
    let end = match limit {
        Some(limit) => start.saturating_add(limit as usize).min(len),
        None => len,
    };
    *messages = messages.drain(start..end).collect();
}

fn chat_to_file(chat: ChatData) -> ChatFile {
    let last_message = chat.messages.last().map(|msg| ChatPreviewMessage {
        role: msg.role,
        content: msg.content.clone(),
        timestamp: msg.timestamp.clone(),
    });
    ChatFile {
        id: chat.id,
        title: chat.title,
        message_count: chat.messages.len() as u64,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
        default_model: chat.default_model,
        last_message,
        file_size: None,
        is_locked: None,
        metadata: chat.metadata,
    }
}

fn matches_list_filters(chat: &ChatFile, request: &ListChatsRequest) -> bool {
    if let Some(after) = &request.created_after
        && chat.created_at.as_str() < after.as_str()
    {
        return false;
    }
    if let Some(before) = &request.created_before
        && chat.created_at.as_str() > before.as_str()
    {
        return false;
    }
    if let Some(after) = &request.updated_after
        && chat.updated_at.as_str() < after.as_str()
    {
        return false;
    }
    if let Some(before) = &request.updated_before
        && chat.updated_at.as_str() > before.as_str()
    {
        return false;
    }
    if let Some(query) = &request.search_query {
        let q = query.to_ascii_lowercase();
        let title_ok = chat.title.to_ascii_lowercase().contains(&q);
        let last_ok = chat
            .last_message
            .as_ref()
            .is_some_and(|m| m.content.to_ascii_lowercase().contains(&q));
        if !title_ok && !last_ok {
            return false;
        }
    }
    if let Some(model) = &request.model_filter
        && !chat.default_model.name.contains(model)
    {
        return false;
    }
    true
}

fn sort_chat_files(
    chats: &mut [ChatFile],
    sort_by: Option<ChatListSortBy>,
    order: Option<SortOrder>,
) {
    let sort_by = sort_by.unwrap_or(ChatListSortBy::UpdatedAt);
    let asc = matches!(order, Some(SortOrder::Asc));
    chats.sort_by(|a, b| {
        let ord = match sort_by {
            ChatListSortBy::CreatedAt => a.created_at.cmp(&b.created_at),
            ChatListSortBy::UpdatedAt => a.updated_at.cmp(&b.updated_at),
            ChatListSortBy::Title => a.title.cmp(&b.title),
            ChatListSortBy::MessageCount => a.message_count.cmp(&b.message_count),
        };
        if asc { ord } else { ord.reverse() }
    });
}

fn pagination_info(total_count: u64, page_size: u32, offset: u32) -> Pagination {
    let page_size = page_size.max(1);
    let total_pages = if total_count == 0 {
        0
    } else {
        total_count.div_ceil(u64::from(page_size)) as u32
    };
    let page = offset / page_size + 1;
    Pagination {
        page,
        page_size,
        total_pages,
        has_next: u64::from(offset) + u64::from(page_size) < total_count,
        has_previous: offset > 0 && total_count > 0,
    }
}

/// Часы, которые отдают и увеличивают фиксированное время (тесты).
pub struct TickClock {
    millis: AtomicU64,
}

impl TickClock {
    /// Стартовое Unix-время в миллисекундах.
    pub fn new(start_millis: u64) -> Self {
        Self {
            millis: AtomicU64::new(start_millis),
        }
    }
}

impl Clock for TickClock {
    fn unix_millis(&self) -> u64 {
        self.millis.fetch_add(1_000, Ordering::SeqCst)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chat::dto::{ChatMessageRole, ChatModelRef};
    use crate::chat::store::MemoryChatStore;
    use crate::host_error::{HostErrorClass, host_error_class};

    struct SeqIds;

    impl IdGenerator for SeqIds {
        fn chat_id(&self, millis: u64) -> String {
            format!("chat_{millis}_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
        }

        fn message_id(&self, millis: u64) -> String {
            format!("msg_{millis}_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
        }
    }

    fn service(store: Arc<MemoryChatStore>) -> ChatService {
        ChatService::with_deps(
            store,
            Arc::new(TickClock::new(1_700_000_000_000)),
            Arc::new(SeqIds),
        )
    }

    fn model() -> ChatModelRef {
        ChatModelRef {
            name: "llama".to_owned(),
            version: None,
            provider: None,
        }
    }

    fn create_req(title: &str) -> CreateChatRequest {
        CreateChatRequest {
            title: title.to_owned(),
            default_model: model(),
            system_prompt: None,
            generation_settings: None,
            metadata: None,
        }
    }

    #[tokio::test]
    async fn create_then_get_roundtrip() {
        let store = Arc::new(MemoryChatStore::new());
        let svc = service(store);
        let created = svc.create(create_req("Новый")).await.expect("create");
        assert!(created.id.starts_with("chat_"));
        assert!(created.messages.is_empty());
        assert_eq!(created.default_model.provider.as_deref(), Some("ollama"));
        let got = svc
            .get(GetChatRequest {
                chat_id: created.id.clone(),
                include_messages: None,
                message_limit: None,
                message_offset: None,
            })
            .await
            .expect("get");
        assert_eq!(got.id, created.id);
        assert_eq!(got.title, "Новый");
    }

    #[tokio::test]
    async fn get_without_messages_clears_history() {
        let store = Arc::new(MemoryChatStore::new());
        let svc = service(store);
        let created = svc.create(create_req("Чат")).await.expect("create");
        svc.add_message(AddMessageRequest {
            chat_id: created.id.clone(),
            role: ChatMessageRole::User,
            content: "hi".to_owned(),
            model: None,
            context: None,
            metadata: None,
        })
        .await
        .expect("add");
        let got = svc
            .get(GetChatRequest {
                chat_id: created.id,
                include_messages: Some(false),
                message_limit: None,
                message_offset: None,
            })
            .await
            .expect("get");
        assert!(got.messages.is_empty());
    }

    #[tokio::test]
    async fn empty_title_does_not_write_store() {
        let store = Arc::new(MemoryChatStore::new());
        let svc = service(store.clone());
        let err = svc.create(create_req("  ")).await.expect_err("validation");
        assert!(matches!(err, CoreError::Validation { .. }));
        assert!(store.list().await.expect("list").is_empty());
        assert_eq!(host_error_class(&err), HostErrorClass::Invalid);
    }

    #[tokio::test]
    async fn update_title_bumps_updated_at() {
        let store = Arc::new(MemoryChatStore::new());
        let svc = service(store);
        let created = svc.create(create_req("Старый")).await.expect("create");
        let updated = svc
            .update(UpdateChatRequest {
                chat_id: created.id.clone(),
                title: Some("Новый".to_owned()),
                default_model: None,
                system_prompt: None,
                generation_settings: None,
                metadata: None,
            })
            .await
            .expect("update");
        assert_eq!(updated.title, "Новый");
        assert!(updated.updated_at >= created.updated_at);
        assert_eq!(updated.default_model.name, "llama");
    }

    #[tokio::test]
    async fn add_message_appends_and_unknown_id_does_not_create() {
        let store = Arc::new(MemoryChatStore::new());
        let svc = service(store.clone());
        let created = svc.create(create_req("Чат")).await.expect("create");
        let added = svc
            .add_message(AddMessageRequest {
                chat_id: created.id.clone(),
                role: ChatMessageRole::User,
                content: "вопрос".to_owned(),
                model: None,
                context: None,
                metadata: None,
            })
            .await
            .expect("add");
        assert!(added.message.id.starts_with("msg_"));
        let got = svc
            .get(GetChatRequest {
                chat_id: created.id,
                include_messages: Some(true),
                message_limit: None,
                message_offset: None,
            })
            .await
            .expect("get");
        assert_eq!(
            got.messages.last().map(|m| m.content.as_str()),
            Some("вопрос")
        );

        let err = svc
            .add_message(AddMessageRequest {
                chat_id: "missing".to_owned(),
                role: ChatMessageRole::User,
                content: "нет".to_owned(),
                model: None,
                context: None,
                metadata: None,
            })
            .await
            .expect_err("not found");
        assert!(matches!(err, CoreError::NotFound { .. }));
        assert_eq!(host_error_class(&err), HostErrorClass::NotFound);
        assert_eq!(store.list().await.expect("list").len(), 1);
    }

    #[tokio::test]
    async fn delete_requires_confirmed_and_returns_id() {
        let store = Arc::new(MemoryChatStore::new());
        let svc = service(store.clone());
        let created = svc.create(create_req("Чат")).await.expect("create");
        let err = svc
            .delete(DeleteChatRequest {
                chat_id: created.id.clone(),
                create_backup: None,
                confirmed: Some(false),
            })
            .await
            .expect_err("not confirmed");
        assert!(matches!(err, CoreError::DeleteNotConfirmed));
        assert_eq!(store.list().await.expect("still there").len(), 1);

        let deleted = svc
            .delete(DeleteChatRequest {
                chat_id: created.id.clone(),
                create_backup: None,
                confirmed: Some(true),
            })
            .await
            .expect("delete");
        assert_eq!(deleted.deleted_chat_id, created.id);
        assert!(store.list().await.expect("gone").is_empty());
    }

    #[tokio::test]
    async fn list_returns_preview_total_and_pagination() {
        let store = Arc::new(MemoryChatStore::new());
        let svc = service(store);
        svc.create(create_req("Альфа")).await.expect("c1");
        svc.create(create_req("Бета")).await.expect("c2");
        let listed = svc
            .list(ListChatsRequest {
                limit: Some(1),
                offset: Some(0),
                search_query: None,
                sort_by: Some(ChatListSortBy::Title),
                sort_order: Some(SortOrder::Asc),
                ..ListChatsRequest::default()
            })
            .await
            .expect("list");
        assert_eq!(listed.total_count, 2);
        assert_eq!(listed.chats.len(), 1);
        assert_eq!(listed.chats[0].message_count, 0);
        assert_eq!(listed.pagination.page, 1);
        assert!(listed.pagination.has_next);
    }
}
