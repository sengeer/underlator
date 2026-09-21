//! Маппинг [`underlator_core::HostErrorClass`] в HTTP-статус и JSON-тело.

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;
use underlator_core::{CoreError, HostErrorClass, host_error_class};

/// Ошибка inbound-адаптера: статус по классу ядра, без обёртки `IpcResponse`.
#[derive(Debug)]
pub struct ApiError {
    class: HostErrorClass,
    message: String,
}

impl ApiError {
    /// Внутренняя ошибка host (обрыв канала SSE и т.п.).
    pub(crate) fn internal(message: impl Into<String>) -> Self {
        Self {
            class: HostErrorClass::Internal,
            message: message.into(),
        }
    }

    fn status(&self) -> StatusCode {
        match self.class {
            HostErrorClass::Invalid => StatusCode::BAD_REQUEST,
            HostErrorClass::NotFound => StatusCode::NOT_FOUND,
            HostErrorClass::Cancelled => StatusCode::CONFLICT,
            HostErrorClass::Unsupported => StatusCode::NOT_IMPLEMENTED,
            HostErrorClass::Provider | HostErrorClass::Http => StatusCode::BAD_GATEWAY,
            HostErrorClass::Storage | HostErrorClass::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn class_name(&self) -> &'static str {
        match self.class {
            HostErrorClass::Invalid => "invalid",
            HostErrorClass::NotFound => "not_found",
            HostErrorClass::Cancelled => "cancelled",
            HostErrorClass::Unsupported => "unsupported",
            HostErrorClass::Provider => "provider",
            HostErrorClass::Http => "http",
            HostErrorClass::Storage => "storage",
            HostErrorClass::Internal => "internal",
        }
    }
}

impl From<CoreError> for ApiError {
    fn from(err: CoreError) -> Self {
        Self {
            class: host_error_class(&err),
            message: err.to_string(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = json!({
            "class": self.class_name(),
            "message": self.message,
        });
        (self.status(), Json(body)).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_host_error_classes_to_status() {
        let cases = [
            (HostErrorClass::Invalid, StatusCode::BAD_REQUEST, "invalid"),
            (HostErrorClass::NotFound, StatusCode::NOT_FOUND, "not_found"),
            (HostErrorClass::Cancelled, StatusCode::CONFLICT, "cancelled"),
            (
                HostErrorClass::Unsupported,
                StatusCode::NOT_IMPLEMENTED,
                "unsupported",
            ),
            (
                HostErrorClass::Provider,
                StatusCode::BAD_GATEWAY,
                "provider",
            ),
            (HostErrorClass::Http, StatusCode::BAD_GATEWAY, "http"),
            (
                HostErrorClass::Storage,
                StatusCode::INTERNAL_SERVER_ERROR,
                "storage",
            ),
            (
                HostErrorClass::Internal,
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal",
            ),
        ];
        for (class, status, name) in cases {
            let err = ApiError {
                class,
                message: "x".to_owned(),
            };
            assert_eq!(err.status(), status, "{name}");
            assert_eq!(err.class_name(), name);
        }
    }
}
