//! HTTP-host Underlator (Docker / web): **driving adapter** над `underlator-core`.
//!
//! Разбор HTTP-входа → вызов application/ports API ядра → сериализация ответа.
//! Доменные правила и исходящий HTTP к LLM здесь не живут.

#![warn(missing_docs)]

use std::path::PathBuf;

use axum::Router;
use axum::middleware;
use axum::routing::get;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;

pub mod auth;
pub mod config;
pub mod error;
mod routes;
pub mod state;

use state::AppState;

/// Адрес bind по умолчанию (loopback). Публичный `0.0.0.0` — только с секретом.
pub const BIND_ADDR: &str = "127.0.0.1:8080";

/// Собирает HTTP-роутер: `/healthz`, `/api/*`, опциональный static SPA.
pub fn router(state: AppState) -> Router {
    let static_dir = state.static_dir.clone();
    let api = routes::api_router().route_layer(middleware::from_fn_with_state(
        state.clone(),
        auth::require_api_auth,
    ));
    let app = Router::new()
        .route("/healthz", get(routes::health::healthz))
        .nest("/api", api)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    match static_dir {
        Some(dir) => with_static(app, dir),
        None => app,
    }
}

fn with_static(app: Router, dir: PathBuf) -> Router {
    let index = dir.join("index.html");
    let serve = ServeDir::new(dir).not_found_service(ServeFile::new(index));
    app.fallback_service(serve)
}

#[cfg(test)]
mod http_tests;
