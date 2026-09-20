//! Маппинг доменных ошибок в host-агностичные классы.
//!
//! Host (Axum / Tauri) выбирает HTTP-статус или код IPC по [`HostErrorClass`],
//! не разбирая строку `Display` и не импортируя типы фреймворков в ядро.

use crate::domain::error::CoreError;

/// Класс ошибки для транспорта host без типов `axum` / `tauri`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HostErrorClass {
    /// Некорректные входные данные.
    Invalid,
    /// Сущность не найдена.
    NotFound,
    /// Операция отменена (`stop`).
    Cancelled,
    /// Операция не поддерживается провайдером.
    Unsupported,
    /// Ошибка выбранного LLM-провайдера.
    Provider,
    /// Сбой хранилища.
    Storage,
    /// Исходящий HTTP.
    Http,
    /// Внутренняя ошибка ядра.
    Internal,
}

/// Возвращает класс ошибки для выбора статуса/кода на стороне host.
pub fn host_error_class(err: &CoreError) -> HostErrorClass {
    match err {
        CoreError::Validation { .. } | CoreError::DeleteNotConfirmed => HostErrorClass::Invalid,
        CoreError::NotFound { .. } => HostErrorClass::NotFound,
        CoreError::ProviderCancelled => HostErrorClass::Cancelled,
        CoreError::ProviderUnsupported { .. } => HostErrorClass::Unsupported,
        CoreError::ProviderUnknown { .. } | CoreError::ProviderCloudDisabled { .. } => {
            HostErrorClass::Provider
        }
        CoreError::Storage { .. } => HostErrorClass::Storage,
        CoreError::HttpTimeout
        | CoreError::HttpNetwork(_)
        | CoreError::HttpStatus { .. }
        | CoreError::HttpRetryExhausted { .. }
        | CoreError::HttpStream(_)
        | CoreError::HttpConfig(_) => HostErrorClass::Http,
        CoreError::Internal(_) => HostErrorClass::Internal,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn not_found_maps_to_not_found_class() {
        let err = CoreError::NotFound {
            entity: "chat".to_owned(),
            id: "missing".to_owned(),
        };
        assert_eq!(host_error_class(&err), HostErrorClass::NotFound);
    }

    #[test]
    fn validation_maps_to_invalid_class() {
        let err = CoreError::Validation {
            message: "пустой title".to_owned(),
        };
        assert_eq!(host_error_class(&err), HostErrorClass::Invalid);
    }

    #[test]
    fn provider_cancelled_maps_to_cancelled_class() {
        assert_eq!(
            host_error_class(&CoreError::ProviderCancelled),
            HostErrorClass::Cancelled
        );
    }

    #[test]
    fn http_status_maps_to_http_class() {
        let err = CoreError::HttpStatus {
            status: 502,
            snippet: String::new(),
        };
        assert_eq!(host_error_class(&err), HostErrorClass::Http);
    }

    #[test]
    fn source_does_not_import_host_frameworks() {
        let text = include_str!("host_error.rs");
        let needles = [
            format!("use {}", "axum"),
            format!("use {}", "tauri"),
            format!("{}::", "axum"),
            format!("{}::", "tauri"),
        ];
        for needle in needles {
            assert!(
                !text.contains(&needle),
                "host_error не должен импортировать host-фреймворки (найдено `{needle}`)"
            );
        }
    }
}
