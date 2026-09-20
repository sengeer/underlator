//! Статический запасной список моделей библиотеки (данные, без IO).

use super::dto::{CatalogModelType, CompatibilityStatus, OllamaModelInfo};
use crate::domain::iso8601::{millis_to_iso8601, unix_millis_now};

/// Статический запасной список (как Electron `STATIC_MODELS`, минимум `qwen3`).
pub fn static_library_models() -> Vec<OllamaModelInfo> {
    let now = millis_to_iso8601(unix_millis_now());
    vec![OllamaModelInfo {
        id: "library-qwen3-3".to_owned(),
        name: "qwen3".to_owned(),
        display_name: "qwen3".to_owned(),
        description: Some("Модель qwen3 из Ollama Library".to_owned()),
        version: Some("latest".to_owned()),
        size: 600_000_000,
        created_at: now.clone(),
        modified_at: now,
        model_type: CatalogModelType::Ollama,
        format: "gguf".to_owned(),
        parameter_size: "Unknown".to_owned(),
        quantization_level: "Unknown".to_owned(),
        digest: None,
        tags: Some(vec!["available".to_owned()]),
        compatibility_status: Some(CompatibilityStatus::Unknown),
        compatibility_messages: None,
    }]
}
