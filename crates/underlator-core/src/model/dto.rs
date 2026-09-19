//! DTO поверхности `model`, зеркало Electron preload и типов Ollama.

use serde::{Deserialize, Serialize};

/// Конфигурация провайдера для вызова generate (`ElectronApiConfig`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProviderConfig {
    /// Идентификатор провайдера.
    pub id: String,
    /// URL провайдера.
    pub url: String,
}

/// Параметры генерации (`OllamaGenerateRequest`) плюс конфиг провайдера.
///
/// JSON-ключи генерации совпадают с текущим Ollama-запросом UI
/// (`max_tokens`, `num_predict`). Поля `id` и `url` — конфиг провайдера.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GenerateRequest {
    /// Название модели.
    pub model: String,
    /// Текст промпта.
    pub prompt: String,
    /// Системный промпт.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system: Option<String>,
    /// Температура генерации.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    /// Максимум токенов в ответе.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    /// Лимит предсказания токенов.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_predict: Option<i32>,
    /// Режим «думания» модели.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub think: Option<bool>,
    /// Контекст продолжения генерации.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<Vec<i32>>,
    /// Идентификатор провайдера.
    pub id: String,
    /// URL провайдера.
    pub url: String,
}

/// Унарный ответ `model.generate`: сконкатенированный сгенерированный текст.
pub type GenerateResult = String;

/// Пустое тело запроса `model.stop`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct StopRequest {}

/// Запрос установки модели (`OllamaPullRequest`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InstallRequest {
    /// Название модели.
    pub name: String,
    /// Необязательный тег.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,
    /// Необязательный реестр.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub registry: Option<String>,
    /// Разрешить insecure registry.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub insecure: Option<bool>,
}

/// Запрос удаления модели (`OllamaDeleteRequest`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RemoveRequest {
    /// Название модели.
    pub name: String,
}

/// Пустое тело запроса `model.list`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct ListModelsRequest {}

/// Элемент списка локальных моделей (`OllamaModel`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OllamaModel {
    /// Название модели.
    pub name: String,
    /// Размер в байтах.
    pub size: u64,
    /// Дата последнего изменения.
    pub modified_at: String,
    /// Дайджест артефакта.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub digest: Option<String>,
    /// Детали формата и квантизации.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<OllamaModelDetails>,
}

/// Вложенные детали модели из `/api/tags`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OllamaModelDetails {
    /// Формат модели.
    pub format: String,
    /// Размер параметров.
    pub parameter_size: String,
    /// Уровень квантизации.
    pub quantization_level: String,
}

/// Ответ `model.list` (`OllamaModelsResponse`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ListModelsResponse {
    /// Массив локальных моделей.
    pub models: Vec<OllamaModel>,
}

/// Унарный результат install/remove: `{ success }`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct UnarySuccess {
    /// Успешность операции.
    pub success: bool,
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
    fn model_dto_json_keys_roundtrip() {
        let generate = GenerateRequest {
            model: "llama".to_owned(),
            prompt: "привет".to_owned(),
            system: None,
            temperature: None,
            max_tokens: Some(16),
            num_predict: None,
            think: None,
            context: None,
            id: "ollama".to_owned(),
            url: "http://127.0.0.1:11434".to_owned(),
        };
        let generate_json = roundtrip(&generate);
        for key in ["model", "prompt", "max_tokens"] {
            assert!(
                generate_json.get(key).is_some(),
                "ожидался ключ {key} в generate"
            );
        }
        assert_eq!(generate_json["id"], json!("ollama"));
        assert_eq!(generate_json["url"], json!("http://127.0.0.1:11434"));

        let install = InstallRequest {
            name: "llama".to_owned(),
            tag: None,
            registry: None,
            insecure: None,
        };
        let install_json = roundtrip(&install);
        assert!(install_json.get("name").is_some(), "ожидался ключ name");

        let listed = ListModelsResponse {
            models: vec![OllamaModel {
                name: "llama".to_owned(),
                size: 1,
                modified_at: "2026-01-01T00:00:00Z".to_owned(),
                digest: None,
                details: None,
            }],
        };
        let list_json = roundtrip(&listed);
        assert!(list_json.get("models").is_some(), "ожидался ключ models");
        assert!(
            list_json["models"][0].get("modified_at").is_some(),
            "ожидался ключ modified_at"
        );
    }

    #[test]
    fn unary_success_and_empty_requests_roundtrip() {
        let success = UnarySuccess { success: true };
        assert_eq!(roundtrip(&success), json!({ "success": true }));
        assert_eq!(roundtrip(&StopRequest {}), json!({}));
        assert_eq!(roundtrip(&ListModelsRequest {}), json!({}));
        let text: GenerateResult = "ok".to_owned();
        assert_eq!(
            serde_json::to_value(&text).expect("сериализация"),
            json!("ok")
        );
    }
}
