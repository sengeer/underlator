//! REST чата: делегирование в [`underlator_core::ChatService`].

use axum::extract::{Path, Query, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use underlator_core::{
    AddMessageRequest, AddMessageResponse, ChatData, CreateChatRequest, DeleteChatRequest,
    DeleteChatResponse, GetChatRequest, ListChatsRequest, ListChatsResponse, UpdateChatRequest,
};

use crate::error::ApiError;
use crate::state::AppState;

/// Маршруты `/chat`.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/chat", post(create_chat).get(list_chats))
        .route(
            "/chat/{id}",
            get(get_chat).patch(update_chat).delete(delete_chat),
        )
        .route("/chat/{id}/messages", post(add_message))
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatGetQuery {
    include_messages: Option<bool>,
    message_limit: Option<u32>,
    message_offset: Option<u32>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatDeleteQuery {
    confirmed: Option<bool>,
    create_backup: Option<bool>,
}

async fn create_chat(
    State(state): State<AppState>,
    Json(request): Json<CreateChatRequest>,
) -> Result<Json<ChatData>, ApiError> {
    Ok(Json(state.chat.create(request).await?))
}

async fn list_chats(
    State(state): State<AppState>,
    Query(request): Query<ListChatsRequest>,
) -> Result<Json<ListChatsResponse>, ApiError> {
    Ok(Json(state.chat.list(request).await?))
}

async fn get_chat(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(query): Query<ChatGetQuery>,
) -> Result<Json<ChatData>, ApiError> {
    let chat = state
        .chat
        .get(GetChatRequest {
            chat_id: id,
            include_messages: query.include_messages,
            message_limit: query.message_limit,
            message_offset: query.message_offset,
        })
        .await?;
    Ok(Json(chat))
}

async fn update_chat(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(mut request): Json<UpdateChatRequest>,
) -> Result<Json<ChatData>, ApiError> {
    request.chat_id = id;
    Ok(Json(state.chat.update(request).await?))
}

async fn delete_chat(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(query): Query<ChatDeleteQuery>,
) -> Result<Json<DeleteChatResponse>, ApiError> {
    let deleted = state
        .chat
        .delete(DeleteChatRequest {
            chat_id: id,
            confirmed: query.confirmed,
            create_backup: query.create_backup,
        })
        .await?;
    Ok(Json(deleted))
}

async fn add_message(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(mut request): Json<AddMessageRequest>,
) -> Result<Json<AddMessageResponse>, ApiError> {
    request.chat_id = id;
    Ok(Json(state.chat.add_message(request).await?))
}
