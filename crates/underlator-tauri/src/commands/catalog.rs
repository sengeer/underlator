//! Thin handlers поверхности `catalog`.

use underlator_core::{
    CatalogFilters, GetCatalogRequest, GetModelInfoRequest, ModelCatalog, OllamaModelInfo,
};

use crate::error::HostError;
use crate::state::AppState;

/// Полный каталог (merge library + local).
pub async fn get(
    state: &AppState,
    request: GetCatalogRequest,
) -> Result<ModelCatalog, HostError> {
    state.catalog.get(request).await.map_err(HostError::from)
}

/// Поиск по фильтрам.
pub async fn search(
    state: &AppState,
    filters: CatalogFilters,
) -> Result<ModelCatalog, HostError> {
    state.catalog.search(filters).await.map_err(HostError::from)
}

/// Карточка модели или `null`, если неизвестна.
pub async fn get_model_info(
    state: &AppState,
    request: GetModelInfoRequest,
) -> Result<Option<OllamaModelInfo>, HostError> {
    state
        .catalog
        .get_model_info(request)
        .await
        .map_err(HostError::from)
}

#[cfg(feature = "desktop")]
mod tauri_cmds {
    use tauri::State;
    use underlator_core::{
        CatalogFilters, GetCatalogRequest, GetModelInfoRequest, ModelCatalog, OllamaModelInfo,
    };

    use super::{get, get_model_info, search};
    use crate::error::HostError;
    use crate::state::AppState;

    /// `catalog_get`.
    #[tauri::command]
    pub async fn catalog_get(
        state: State<'_, AppState>,
        request: Option<GetCatalogRequest>,
    ) -> Result<ModelCatalog, HostError> {
        get(&state, request.unwrap_or_default()).await
    }

    /// `catalog_search`.
    #[tauri::command]
    pub async fn catalog_search(
        state: State<'_, AppState>,
        request: CatalogFilters,
    ) -> Result<ModelCatalog, HostError> {
        search(&state, request).await
    }

    /// `catalog_get_model_info` — `null` для неизвестной модели.
    #[tauri::command]
    pub async fn catalog_get_model_info(
        state: State<'_, AppState>,
        request: GetModelInfoRequest,
    ) -> Result<Option<OllamaModelInfo>, HostError> {
        get_model_info(&state, request).await
    }
}

#[cfg(feature = "desktop")]
pub use tauri_cmds::*;
