//! REST каталога: делегирование в [`underlator_core::CatalogService`].

use axum::extract::{Path, Query, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use underlator_core::{
    CatalogFilters, GetCatalogRequest, GetModelInfoRequest, ModelCatalog, OllamaModelInfo,
};

use crate::error::ApiError;
use crate::state::AppState;

/// Маршруты `/catalog`.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/catalog", get(get_catalog))
        .route("/catalog/search", post(search_catalog))
        .route("/catalog/models/{name}", get(get_model_info))
}

async fn get_catalog(
    State(state): State<AppState>,
    Query(request): Query<GetCatalogRequest>,
) -> Result<Json<ModelCatalog>, ApiError> {
    let catalog = state.catalog.get(request).await?;
    Ok(Json(catalog))
}

async fn search_catalog(
    State(state): State<AppState>,
    Json(filters): Json<CatalogFilters>,
) -> Result<Json<ModelCatalog>, ApiError> {
    let catalog = state.catalog.search(filters).await?;
    Ok(Json(catalog))
}

async fn get_model_info(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<Option<OllamaModelInfo>>, ApiError> {
    let info = state
        .catalog
        .get_model_info(GetModelInfoRequest { model_name: name })
        .await?;
    Ok(Json(info))
}
