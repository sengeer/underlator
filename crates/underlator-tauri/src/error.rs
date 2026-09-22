//! Маппинг [`underlator_core::CoreError`] → сериализуемая ошибка Tauri.

use serde::Serialize;
use underlator_core::{CoreError, HostErrorClass, host_error_class};

/// Ошибка inbound-адаптера: `{ class, message }` для `TauriTransport`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct HostError {
    /// Класс ошибки ядра (`not_found`, `invalid`, …).
    pub class: &'static str,
    /// Человекочитаемое сообщение.
    pub message: String,
}

impl HostError {
    /// Создаёт ошибку из уже известного класса.
    pub fn new(class: HostErrorClass, message: impl Into<String>) -> Self {
        Self {
            class: class_name(class),
            message: message.into(),
        }
    }

    /// Внутренняя ошибка host (wiring / IO).
    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(HostErrorClass::Internal, message)
    }
}

impl From<CoreError> for HostError {
    fn from(err: CoreError) -> Self {
        Self {
            class: class_name(host_error_class(&err)),
            message: err.to_string(),
        }
    }
}

impl std::fmt::Display for HostError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.class, self.message)
    }
}

impl std::error::Error for HostError {}

fn class_name(class: HostErrorClass) -> &'static str {
    match class {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn not_found_and_invalid_are_classified_not_success() {
        let not_found = HostError::from(CoreError::NotFound {
            entity: "chat".to_owned(),
            id: "missing".to_owned(),
        });
        assert_eq!(not_found.class, "not_found");
        assert!(!not_found.message.is_empty());

        let invalid = HostError::from(CoreError::Validation {
            message: "пустой prompt".to_owned(),
        });
        assert_eq!(invalid.class, "invalid");

        let json = serde_json::to_value(&not_found).expect("json");
        assert_eq!(json["class"], "not_found");
        assert!(json.get("message").is_some());
        assert!(json.get("success").is_none());
    }
}
