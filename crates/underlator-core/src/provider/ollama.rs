//! Runtime-адаптер локального Ollama поверх [`crate::http::HttpClient`].
//!
//! Вендорные пути живут только здесь. Эмбеддинги, show и health-check
//! в этот атом не входят. `embedded-ollama` использует тот же HTTP-адаптер
//! (lifecycle splash — вне скоупа).

use std::pin::Pin;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll, Waker};

use async_trait::async_trait;
use bytes::Bytes;
use futures_util::{Stream, StreamExt};
use serde::Deserialize;
use serde::Serialize;

use crate::error::CoreError;
use crate::events::{GenerateProgress, InstallProgress, InstallStatus};
use crate::http::{HttpClient, HttpClientConfig, HttpMethod, HttpRequest, StreamMode};
use crate::model::dto::{
    GenerateRequest, InstallRequest, ListModelsRequest, ListModelsResponse, RemoveRequest,
    UnarySuccess,
};

use super::port::{LlmProvider, ProviderStream};

const PATH_GENERATE: &str = "api/generate";
const PATH_TAGS: &str = "api/tags";
const PATH_PULL: &str = "api/pull";
const PATH_DELETE: &str = "api/delete";
const DEFAULT_TEMPERATURE: f64 = 0.7;

/// Runtime-адаптер локального Ollama.
pub struct OllamaProvider {
    id: String,
    client: HttpClient,
    generate_guard: Mutex<Option<Arc<CancelGuard>>>,
}

struct CancelGuard {
    cancelled: AtomicBool,
    waker: Mutex<Option<Waker>>,
}

impl CancelGuard {
    fn new() -> Arc<Self> {
        Arc::new(Self {
            cancelled: AtomicBool::new(false),
            waker: Mutex::new(None),
        })
    }

    fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
        if let Ok(mut slot) = self.waker.lock()
            && let Some(waker) = slot.take()
        {
            waker.wake();
        }
    }

    fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    fn store_waker(&self, waker: &Waker) {
        if let Ok(mut slot) = self.waker.lock() {
            *slot = Some(waker.clone());
        }
    }
}

impl OllamaProvider {
    /// Собирает адаптер с HTTP-клиентом на `url`. Сеть не используется.
    pub fn from_url(id: impl Into<String>, url: &str) -> Result<Self, CoreError> {
        let client = HttpClient::from_config(HttpClientConfig {
            base_url: url.to_owned(),
            ..HttpClientConfig::default()
        })?;
        Ok(Self {
            id: id.into(),
            client,
            generate_guard: Mutex::new(None),
        })
    }

    fn replace_generate_guard(&self) -> Arc<CancelGuard> {
        let guard = CancelGuard::new();
        if let Ok(mut slot) = self.generate_guard.lock() {
            if let Some(previous) = slot.take() {
                previous.cancel();
            }
            *slot = Some(Arc::clone(&guard));
        }
        guard
    }

    fn take_generate_guard(&self) -> Option<Arc<CancelGuard>> {
        self.generate_guard
            .lock()
            .ok()
            .and_then(|mut slot| slot.take())
    }

    fn generate_body<'a>(request: &'a GenerateRequest) -> OllamaGenerateBody<'a> {
        OllamaGenerateBody {
            model: &request.model,
            prompt: &request.prompt,
            system: request.system.as_deref(),
            temperature: request.temperature.unwrap_or(DEFAULT_TEMPERATURE),
            max_tokens: request.max_tokens,
            num_predict: request.num_predict,
            think: request.think,
            context: request.context.as_deref(),
            stream: true,
        }
    }
}

#[derive(Serialize)]
struct OllamaGenerateBody<'a> {
    model: &'a str,
    prompt: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<&'a str>,
    temperature: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    num_predict: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    think: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    context: Option<&'a [i32]>,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaPullFrame {
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    error: Option<String>,
    #[serde(default)]
    digest: Option<String>,
    #[serde(default)]
    total: Option<u64>,
    #[serde(default)]
    completed: Option<u64>,
    #[serde(default)]
    size: Option<u64>,
    #[serde(default)]
    name: Option<String>,
}

fn map_install_status(raw: &str) -> InstallStatus {
    let lower = raw.to_ascii_lowercase();
    if lower.contains("verif") {
        InstallStatus::Verifying
    } else if lower.contains("writ") {
        InstallStatus::Writing
    } else if lower.contains("complete") || lower.contains("success") {
        InstallStatus::Complete
    } else {
        InstallStatus::Downloading
    }
}

fn map_pull_frame(bytes: &Bytes, fallback_name: &str) -> Result<InstallProgress, CoreError> {
    let frame: OllamaPullFrame = serde_json::from_slice(bytes)
        .map_err(|err| CoreError::Internal(format!("не удалось разобрать кадр pull: {err}")))?;
    if let Some(error) = frame.error.as_deref().filter(|text| !text.is_empty()) {
        return Err(CoreError::Internal(format!(
            "ошибка установки модели: {error}"
        )));
    }
    let status = frame
        .status
        .as_deref()
        .map(map_install_status)
        .unwrap_or(InstallStatus::Downloading);
    Ok(InstallProgress {
        status,
        name: frame
            .name
            .filter(|name| !name.is_empty())
            .unwrap_or_else(|| fallback_name.to_owned()),
        size: frame.size.or(frame.completed),
        total: frame.total,
        digest: frame.digest,
        error: None,
    })
}

fn map_generate_frame(bytes: &Bytes) -> Result<GenerateProgress, CoreError> {
    serde_json::from_slice(bytes)
        .map_err(|err| CoreError::Internal(format!("не удалось разобрать кадр generate: {err}")))
}

struct CancellableStream<T> {
    inner: Option<ProviderStream<T>>,
    guard: Arc<CancelGuard>,
    emitted_cancel: bool,
}

impl<T> Stream for CancellableStream<T> {
    type Item = Result<T, CoreError>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        this.guard.store_waker(cx.waker());
        if this.guard.is_cancelled() {
            this.inner.take();
            if this.emitted_cancel {
                return Poll::Ready(None);
            }
            this.emitted_cancel = true;
            return Poll::Ready(Some(Err(CoreError::ProviderCancelled)));
        }
        let Some(inner) = this.inner.as_mut() else {
            return Poll::Ready(None);
        };
        match inner.as_mut().poll_next(cx) {
            Poll::Ready(None) => {
                this.inner.take();
                Poll::Ready(None)
            }
            other => other,
        }
    }
}

#[async_trait]
impl LlmProvider for OllamaProvider {
    fn provider_id(&self) -> &str {
        &self.id
    }

    async fn generate_stream(
        &self,
        request: &GenerateRequest,
    ) -> Result<ProviderStream<GenerateProgress>, CoreError> {
        let guard = self.replace_generate_guard();
        let body = Self::generate_body(request);
        let http_request = HttpRequest::new(HttpMethod::Post, PATH_GENERATE).json(&body)?;
        let byte_stream = self
            .client
            .send_stream(http_request, StreamMode::NdJson)
            .await?;
        let mapped: ProviderStream<GenerateProgress> =
            Box::pin(byte_stream.map(|item| match item {
                Ok(bytes) => map_generate_frame(&bytes),
                Err(err) => Err(err),
            }));
        Ok(Box::pin(CancellableStream {
            inner: Some(mapped),
            guard,
            emitted_cancel: false,
        }))
    }

    async fn stop(&self) -> Result<(), CoreError> {
        match self.take_generate_guard() {
            None => Ok(()),
            Some(guard) => {
                guard.cancel();
                Ok(())
            }
        }
    }

    async fn list_models(&self) -> Result<ListModelsResponse, CoreError> {
        self.client
            .send_json(HttpMethod::Get, PATH_TAGS, &ListModelsRequest::default())
            .await
    }

    async fn install_model(
        &self,
        request: &InstallRequest,
    ) -> Result<ProviderStream<InstallProgress>, CoreError> {
        let http_request = HttpRequest::new(HttpMethod::Post, PATH_PULL).json(request)?;
        let byte_stream = self
            .client
            .send_stream(http_request, StreamMode::NdJson)
            .await?;
        let name = request.name.clone();
        Ok(Box::pin(byte_stream.map(move |item| match item {
            Ok(bytes) => map_pull_frame(&bytes, &name),
            Err(err) => Err(err),
        })))
    }

    async fn remove_model(&self, request: &RemoveRequest) -> Result<UnarySuccess, CoreError> {
        self.client
            .send_json_or_empty(HttpMethod::Delete, PATH_DELETE, request)
            .await
    }
}
