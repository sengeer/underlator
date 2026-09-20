//! Единая модель progress-событий generate/install без транспорта host.
//!
//! Строковые имена совпадают с Electron IPC (`model:generate-progress`,
//! `model:install-progress`). Core не знает IPC, WebSocket, SSE или Tauri emit.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// Стабильное имя события прогресса генерации для host emit.
pub const GENERATE_PROGRESS_EVENT: &str = "model:generate-progress";

/// Стабильное имя события прогресса установки для host emit.
pub const INSTALL_PROGRESS_EVENT: &str = "model:install-progress";

/// Идентификатор события генерации в карте имён core.
pub const GENERATE_PROGRESS_CORE_NAME: &str = "events::generate_progress";

/// Идентификатор события установки в карте имён core.
pub const INSTALL_PROGRESS_CORE_NAME: &str = "events::install_progress";

/// Chunk потока generate (`OllamaGenerateResponse`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GenerateProgress {
    /// Название модели.
    pub model: String,
    /// Фрагмент текста.
    pub response: String,
    /// Время создания chunk.
    pub created_at: String,
    /// Поток завершён.
    pub done: bool,
    /// Полная длительность (нс).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_duration: Option<u64>,
    /// Время загрузки модели.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub load_duration: Option<u64>,
    /// Время оценки промпта.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_eval_duration: Option<u64>,
    /// Время генерации.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eval_duration: Option<u64>,
    /// Число токенов промпта.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_eval_count: Option<u32>,
    /// Число сгенерированных токенов.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eval_count: Option<u32>,
    /// Контекст продолжения.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<Vec<i32>>,
    /// Дополнительные поля chunk (index signature TypeScript).
    #[serde(flatten, default)]
    pub extra: Map<String, Value>,
}

/// Статус установки модели.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InstallStatus {
    /// Идёт загрузка.
    Downloading,
    /// Проверка целостности.
    Verifying,
    /// Запись на диск.
    Writing,
    /// Установка завершена.
    Complete,
}

/// Прогресс установки модели (`OllamaPullProgress`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InstallProgress {
    /// Статус операции.
    pub status: InstallStatus,
    /// Название модели.
    pub name: String,
    /// Загружено байт.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    /// Полный размер.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<u64>,
    /// Дайджест слоя.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub digest: Option<String>,
    /// Сообщение об ошибке.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Единая модель progress-событий ядра (без обёртки транспорта).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CoreEvent {
    /// Chunk генерации.
    GenerateProgress(GenerateProgress),
    /// Прогресс установки модели.
    InstallProgress(InstallProgress),
}

impl CoreEvent {
    /// Строковое имя события для host emit (IPC / WS / Tauri).
    pub fn name(&self) -> &'static str {
        match self {
            Self::GenerateProgress(_) => GENERATE_PROGRESS_EVENT,
            Self::InstallProgress(_) => INSTALL_PROGRESS_EVENT,
        }
    }

    /// Идентификатор события в карте имён core.
    pub fn core_name(&self) -> &'static str {
        match self {
            Self::GenerateProgress(_) => GENERATE_PROGRESS_CORE_NAME,
            Self::InstallProgress(_) => INSTALL_PROGRESS_CORE_NAME,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json};

    fn roundtrip<T>(value: &T) -> Value
    where
        T: Serialize + serde::de::DeserializeOwned + PartialEq + std::fmt::Debug,
    {
        let json = serde_json::to_value(value).expect("сериализация");
        let back: T = serde_json::from_value(json.clone()).expect("десериализация");
        assert_eq!(value, &back);
        json
    }

    #[test]
    fn progress_payload_json_keys_roundtrip() {
        let generate = GenerateProgress {
            model: "llama".to_owned(),
            response: "токен".to_owned(),
            created_at: "2026-01-01T00:00:00Z".to_owned(),
            done: false,
            total_duration: None,
            load_duration: None,
            prompt_eval_duration: None,
            eval_duration: None,
            prompt_eval_count: None,
            eval_count: None,
            context: None,
            extra: Map::new(),
        };
        let generate_json = roundtrip(&generate);
        for key in ["response", "done", "created_at"] {
            assert!(
                generate_json.get(key).is_some(),
                "ожидался ключ {key} в generate progress"
            );
        }

        let install = InstallProgress {
            status: InstallStatus::Downloading,
            name: "llama".to_owned(),
            size: Some(10),
            total: Some(100),
            digest: None,
            error: None,
        };
        let install_json = roundtrip(&install);
        assert!(install_json.get("status").is_some(), "ожидался ключ status");
        assert!(install_json.get("name").is_some(), "ожидался ключ name");
        assert_eq!(install_json["status"], "downloading");
    }

    #[test]
    fn generate_progress_flattens_extra_fields() {
        let mut extra = Map::new();
        extra.insert("vendor_flag".to_owned(), json!(true));
        let chunk = GenerateProgress {
            model: "llama".to_owned(),
            response: String::new(),
            created_at: "t".to_owned(),
            done: true,
            total_duration: None,
            load_duration: None,
            prompt_eval_duration: None,
            eval_duration: None,
            prompt_eval_count: None,
            eval_count: None,
            context: None,
            extra,
        };
        let json = roundtrip(&chunk);
        assert_eq!(json["vendor_flag"], json!(true));
        assert!(json.get("extra").is_none());
    }

    #[test]
    fn core_event_names_match_electron_ipc() {
        let generate = CoreEvent::GenerateProgress(GenerateProgress {
            model: "m".to_owned(),
            response: String::new(),
            created_at: "t".to_owned(),
            done: true,
            total_duration: None,
            load_duration: None,
            prompt_eval_duration: None,
            eval_duration: None,
            prompt_eval_count: None,
            eval_count: None,
            context: None,
            extra: Map::new(),
        });
        assert_eq!(generate.name(), "model:generate-progress");
        assert_eq!(generate.core_name(), "events::generate_progress");

        let install = CoreEvent::InstallProgress(InstallProgress {
            status: InstallStatus::Complete,
            name: "m".to_owned(),
            size: None,
            total: None,
            digest: None,
            error: None,
        });
        assert_eq!(install.name(), "model:install-progress");
        assert_eq!(install.core_name(), "events::install_progress");
    }
}
