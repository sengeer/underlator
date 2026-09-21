//! REST/SSE поверхности `model`: делегирование в [`underlator_core::ModelService`].

use std::convert::Infallible;

use axum::extract::State;
use axum::response::sse::{Event, Sse};
use axum::routing::{get, post};
use axum::{Json, Router};
use futures_util::stream::{Stream, StreamExt};
use serde::Serialize;
use tokio_stream::wrappers::UnboundedReceiverStream;
use underlator_core::{
    GENERATE_PROGRESS_EVENT, GenerateRequest, INSTALL_PROGRESS_EVENT, InstallRequest,
    ListModelsRequest, ListModelsResponse, RemoveRequest, StopRequest, UnarySuccess,
};

use crate::error::ApiError;
use crate::state::AppState;

/// Маршруты `/model`.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/model/generate", post(generate))
        .route("/model/stop", post(stop))
        .route("/model/install", post(install))
        .route("/model/remove", post(remove))
        .route("/model/list", get(list_models))
}

enum SseMsg {
    Named { event: &'static str, data: String },
    Failed(underlator_core::CoreError),
}

async fn generate(
    State(state): State<AppState>,
    Json(request): Json<GenerateRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>> + Send>, ApiError> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let model = state.model.clone();
    tokio::spawn(async move {
        let result = model
            .generate(request, |chunk| {
                let _ = tx.send(named(GENERATE_PROGRESS_EVENT, &chunk));
            })
            .await;
        send_outcome(&tx, result);
    });
    sse_after_first(rx).await
}

async fn install(
    State(state): State<AppState>,
    Json(request): Json<InstallRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>> + Send>, ApiError> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let model = state.model.clone();
    tokio::spawn(async move {
        let result = model
            .install(request, |frame| {
                let _ = tx.send(named(INSTALL_PROGRESS_EVENT, &frame));
            })
            .await;
        send_outcome(&tx, result);
    });
    sse_after_first(rx).await
}

async fn stop(State(state): State<AppState>) -> Result<Json<()>, ApiError> {
    state.model.stop(StopRequest {}).await?;
    Ok(Json(()))
}

async fn remove(
    State(state): State<AppState>,
    Json(request): Json<RemoveRequest>,
) -> Result<Json<UnarySuccess>, ApiError> {
    Ok(Json(state.model.remove(request).await?))
}

async fn list_models(State(state): State<AppState>) -> Result<Json<ListModelsResponse>, ApiError> {
    Ok(Json(state.model.list(ListModelsRequest {}).await?))
}

fn named<T: Serialize>(event: &'static str, value: &T) -> SseMsg {
    SseMsg::Named {
        event,
        data: serde_json::to_string(value).unwrap_or_else(|_| "null".to_owned()),
    }
}

fn send_outcome<T: Serialize>(
    tx: &tokio::sync::mpsc::UnboundedSender<SseMsg>,
    result: Result<T, underlator_core::CoreError>,
) {
    match result {
        Ok(value) => {
            let _ = tx.send(named("result", &value));
        }
        Err(err) => {
            let _ = tx.send(SseMsg::Failed(err));
        }
    }
}

async fn sse_after_first(
    mut rx: tokio::sync::mpsc::UnboundedReceiver<SseMsg>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>> + Send>, ApiError> {
    let first = rx
        .recv()
        .await
        .ok_or_else(|| ApiError::internal("поток use-case завершился без событий"))?;
    match first {
        SseMsg::Failed(err) => Err(err.into()),
        first => {
            let stream = futures_util::stream::iter(std::iter::once(first))
                .chain(UnboundedReceiverStream::new(rx))
                .filter_map(|msg| std::future::ready(sse_msg_to_event(msg)));
            Ok(Sse::new(stream))
        }
    }
}

fn sse_msg_to_event(msg: SseMsg) -> Option<Result<Event, Infallible>> {
    match msg {
        SseMsg::Named { event, data } => Some(Ok(Event::default().event(event).data(data))),
        SseMsg::Failed(_) => None,
    }
}
