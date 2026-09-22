//! Thin handlers поверхности `model`.

use underlator_core::{
    GenerateProgress, GenerateRequest, InstallProgress, InstallRequest, ListModelsRequest,
    ListModelsResponse, RemoveRequest, StopRequest, UnarySuccess,
};

use crate::error::HostError;
use crate::state::AppState;

/// Generate: progress callback + сконкатенированная строка.
pub async fn generate_with_progress(
    state: &AppState,
    request: GenerateRequest,
    on_progress: impl FnMut(GenerateProgress),
) -> Result<String, HostError> {
    state
        .model
        .generate(request, on_progress)
        .await
        .map_err(HostError::from)
}

/// Остановка активного generate на том же `Arc` провайдера.
pub async fn stop(state: &AppState) -> Result<(), HostError> {
    state
        .model
        .stop(StopRequest {})
        .await
        .map_err(HostError::from)
}

/// Install: progress callback + `{ success: true }`.
pub async fn install_with_progress(
    state: &AppState,
    request: InstallRequest,
    on_progress: impl FnMut(InstallProgress),
) -> Result<UnarySuccess, HostError> {
    state
        .model
        .install(request, on_progress)
        .await
        .map_err(HostError::from)
}

/// Удаление модели.
pub async fn remove(state: &AppState, request: RemoveRequest) -> Result<UnarySuccess, HostError> {
    state.model.remove(request).await.map_err(HostError::from)
}

/// Список локальных моделей.
pub async fn list(state: &AppState) -> Result<ListModelsResponse, HostError> {
    state
        .model
        .list(ListModelsRequest {})
        .await
        .map_err(HostError::from)
}

#[cfg(feature = "desktop")]
mod tauri_cmds {
    use tauri::{AppHandle, Emitter, State};
    use underlator_core::{
        GENERATE_PROGRESS_EVENT, GenerateRequest, INSTALL_PROGRESS_EVENT, InstallRequest,
        ListModelsResponse, RemoveRequest, UnarySuccess,
    };

    use super::{generate_with_progress, install_with_progress, list, remove, stop};
    use crate::error::HostError;
    use crate::state::AppState;

    /// `model_generate`: emit progress, return строку.
    #[tauri::command]
    pub async fn model_generate(
        app: AppHandle,
        state: State<'_, AppState>,
        request: GenerateRequest,
    ) -> Result<String, HostError> {
        generate_with_progress(&state, request, |chunk| {
            let _ = app.emit(GENERATE_PROGRESS_EVENT, &chunk);
        })
        .await
    }

    /// `model_stop`.
    #[tauri::command]
    pub async fn model_stop(state: State<'_, AppState>) -> Result<(), HostError> {
        stop(&state).await
    }

    /// `model_install`: emit progress, return `{ success: true }`.
    #[tauri::command]
    pub async fn model_install(
        app: AppHandle,
        state: State<'_, AppState>,
        request: InstallRequest,
    ) -> Result<UnarySuccess, HostError> {
        install_with_progress(&state, request, |frame| {
            let _ = app.emit(INSTALL_PROGRESS_EVENT, &frame);
        })
        .await
    }

    /// `model_remove`.
    #[tauri::command]
    pub async fn model_remove(
        state: State<'_, AppState>,
        request: RemoveRequest,
    ) -> Result<UnarySuccess, HostError> {
        remove(&state, request).await
    }

    /// `model_list`.
    #[tauri::command]
    pub async fn model_list(state: State<'_, AppState>) -> Result<ListModelsResponse, HostError> {
        list(&state).await
    }
}

#[cfg(feature = "desktop")]
pub use tauri_cmds::*;
