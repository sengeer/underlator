//! HTTP-маршруты inbound-адаптера (без доменных правил).

pub mod catalog;
pub mod chat;
pub mod health;
pub mod model;

use axum::Router;

use crate::state::AppState;

/// Собирает дерево `/api/model|catalog|chat`.
pub fn api_router() -> Router<AppState> {
    Router::new()
        .merge(model::router())
        .merge(catalog::router())
        .merge(chat::router())
}
