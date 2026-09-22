//! Thin handlers поверхности `chat`.

use underlator_core::{
    AddMessageRequest, AddMessageResponse, ChatData, CreateChatRequest, DeleteChatRequest,
    DeleteChatResponse, GetChatRequest, ListChatsRequest, ListChatsResponse, UpdateChatRequest,
};

use crate::error::HostError;
use crate::state::AppState;

/// Создание чата.
pub async fn create(state: &AppState, request: CreateChatRequest) -> Result<ChatData, HostError> {
    state.chat.create(request).await.map_err(HostError::from)
}

/// Чтение чата.
pub async fn get(state: &AppState, request: GetChatRequest) -> Result<ChatData, HostError> {
    state.chat.get(request).await.map_err(HostError::from)
}

/// Обновление чата.
pub async fn update(state: &AppState, request: UpdateChatRequest) -> Result<ChatData, HostError> {
    state.chat.update(request).await.map_err(HostError::from)
}

/// Удаление чата.
pub async fn delete(
    state: &AppState,
    request: DeleteChatRequest,
) -> Result<DeleteChatResponse, HostError> {
    state.chat.delete(request).await.map_err(HostError::from)
}

/// Список чатов.
pub async fn list(
    state: &AppState,
    request: ListChatsRequest,
) -> Result<ListChatsResponse, HostError> {
    state.chat.list(request).await.map_err(HostError::from)
}

/// Добавление сообщения.
pub async fn add_message(
    state: &AppState,
    request: AddMessageRequest,
) -> Result<AddMessageResponse, HostError> {
    state
        .chat
        .add_message(request)
        .await
        .map_err(HostError::from)
}

#[cfg(feature = "desktop")]
mod tauri_cmds {
    use tauri::State;
    use underlator_core::{
        AddMessageRequest, AddMessageResponse, ChatData, CreateChatRequest, DeleteChatRequest,
        DeleteChatResponse, GetChatRequest, ListChatsRequest, ListChatsResponse, UpdateChatRequest,
    };

    use super::{add_message, create, delete, get, list, update};
    use crate::error::HostError;
    use crate::state::AppState;

    /// `chat_create`.
    #[tauri::command]
    pub async fn chat_create(
        state: State<'_, AppState>,
        request: CreateChatRequest,
    ) -> Result<ChatData, HostError> {
        create(&state, request).await
    }

    /// `chat_get`.
    #[tauri::command]
    pub async fn chat_get(
        state: State<'_, AppState>,
        request: GetChatRequest,
    ) -> Result<ChatData, HostError> {
        get(&state, request).await
    }

    /// `chat_update`.
    #[tauri::command]
    pub async fn chat_update(
        state: State<'_, AppState>,
        request: UpdateChatRequest,
    ) -> Result<ChatData, HostError> {
        update(&state, request).await
    }

    /// `chat_delete`.
    #[tauri::command]
    pub async fn chat_delete(
        state: State<'_, AppState>,
        request: DeleteChatRequest,
    ) -> Result<DeleteChatResponse, HostError> {
        delete(&state, request).await
    }

    /// `chat_list`.
    #[tauri::command]
    pub async fn chat_list(
        state: State<'_, AppState>,
        request: Option<ListChatsRequest>,
    ) -> Result<ListChatsResponse, HostError> {
        list(&state, request.unwrap_or_default()).await
    }

    /// `chat_add_message`.
    #[tauri::command]
    pub async fn chat_add_message(
        state: State<'_, AppState>,
        request: AddMessageRequest,
    ) -> Result<AddMessageResponse, HostError> {
        add_message(&state, request).await
    }
}

#[cfg(feature = "desktop")]
pub use tauri_cmds::*;
