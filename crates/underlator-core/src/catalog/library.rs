//! Порт источника библиотеки моделей, HTTP-адаптер и статический fallback.

use async_trait::async_trait;

use crate::catalog::dto::{CatalogModelType, CompatibilityStatus, OllamaModelInfo};
use crate::error::CoreError;
use crate::http::{HttpClient, HttpClientConfig, HttpMethod, HttpRequest};
use crate::iso8601::{millis_to_iso8601, unix_millis_now};

/// URL публичного library API (единственное место вендорного адреса каталога).
const LIBRARY_BASE_URL: &str = "https://ollama-models.zwz.workers.dev";

/// Источник карточек библиотеки моделей.
#[async_trait]
pub trait CatalogLibrary: Send + Sync {
    /// Загружает карточки библиотеки. Ошибка сети/разбора — на совести вызывающего.
    async fn fetch_models(&self) -> Result<Vec<OllamaModelInfo>, CoreError>;
}

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

/// HTTP-адаптер library API через [`HttpClient`].
pub struct HttpCatalogLibrary {
    client: HttpClient,
}

impl HttpCatalogLibrary {
    /// Клиент с базовым URL library API.
    pub fn new() -> Result<Self, CoreError> {
        let client = HttpClient::from_config(HttpClientConfig {
            base_url: LIBRARY_BASE_URL.to_owned(),
            ..HttpClientConfig::default()
        })?;
        Ok(Self { client })
    }
}

#[derive(Debug, serde::Deserialize)]
struct LibraryApiModel {
    name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
}

#[async_trait]
impl CatalogLibrary for HttpCatalogLibrary {
    async fn fetch_models(&self) -> Result<Vec<OllamaModelInfo>, CoreError> {
        let bytes = self
            .client
            .send(HttpRequest::new(HttpMethod::Get, ""))
            .await?;
        let api_models: Vec<LibraryApiModel> = serde_json::from_slice(&bytes).map_err(|err| {
            CoreError::Internal(format!("не удалось разобрать ответ library API: {err}"))
        })?;
        Ok(map_library_models(&api_models))
    }
}

fn map_library_models(api_models: &[LibraryApiModel]) -> Vec<OllamaModelInfo> {
    let now = millis_to_iso8601(unix_millis_now());
    let mut cards = Vec::new();
    for api in api_models {
        if api.tags.is_empty() {
            cards.push(library_card(
                &api.name,
                api.description.as_deref(),
                "latest",
                vec!["library".to_owned()],
                cards.len(),
                &now,
            ));
            continue;
        }
        for tag in &api.tags {
            let full_name = if tag.contains(':') {
                tag.clone()
            } else {
                format!("{}:{tag}", api.name)
            };
            let mut tags = api.tags.clone();
            tags.push("library".to_owned());
            cards.push(library_card(
                &full_name,
                api.description.as_deref(),
                tag,
                tags,
                cards.len(),
                &now,
            ));
        }
    }
    cards
}

fn library_card(
    name: &str,
    description: Option<&str>,
    version: &str,
    tags: Vec<String>,
    index: usize,
    now: &str,
) -> OllamaModelInfo {
    OllamaModelInfo {
        id: format!("library-{name}-{index}"),
        name: name.to_owned(),
        display_name: name.to_owned(),
        description: Some(
            description
                .map(str::to_owned)
                .unwrap_or_else(|| format!("Модель {name} из Ollama")),
        ),
        version: Some(version.to_owned()),
        size: 0,
        created_at: now.to_owned(),
        modified_at: now.to_owned(),
        model_type: CatalogModelType::Ollama,
        format: "gguf".to_owned(),
        parameter_size: "Unknown".to_owned(),
        quantization_level: "Unknown".to_owned(),
        digest: None,
        tags: Some(tags),
        compatibility_status: Some(CompatibilityStatus::Unknown),
        compatibility_messages: None,
    }
}
