//! Use-cases поверхности `model`: generate / stop / install / remove / list.

use std::sync::Arc;

use futures_util::StreamExt;

use crate::domain::error::CoreError;
use crate::domain::events::{GenerateProgress, InstallProgress};
use crate::domain::model::dto::{
    GenerateRequest, GenerateResult, InstallRequest, ListModelsRequest, ListModelsResponse,
    RemoveRequest, StopRequest, UnarySuccess, request_provider_id, request_provider_url,
};
use crate::ports::{LlmProvider, LlmProviderFactory};

/// Исполняемые use-cases `model` на process-scoped [`LlmProvider`].
///
/// Generate/`stop` всегда на process `Arc`. List/install/remove при непустом
/// `url` в запросе идут через краткоживущий провайдер из [`LlmProviderFactory`].
#[derive(Clone)]
pub struct ModelService {
    provider: Arc<dyn LlmProvider>,
    factory: Arc<dyn LlmProviderFactory>,
}

impl ModelService {
    /// Собирает сервис вокруг process-провайдера и фабрики override.
    pub fn new(provider: Arc<dyn LlmProvider>, factory: Arc<dyn LlmProviderFactory>) -> Self {
        Self { provider, factory }
    }

    /// Потоковая генерация: callback прогресса и конкатенация `response`.
    pub async fn generate(
        &self,
        request: GenerateRequest,
        mut on_progress: impl FnMut(GenerateProgress),
    ) -> Result<GenerateResult, CoreError> {
        if request.model.is_empty() || request.prompt.is_empty() {
            return Err(CoreError::Validation {
                message: "model и prompt обязательны".to_owned(),
            });
        }
        let mut stream = self.provider.generate_stream(&request).await?;
        let mut out = String::new();
        while let Some(item) = stream.next().await {
            let chunk = item?;
            out.push_str(&chunk.response);
            on_progress(chunk);
        }
        Ok(out)
    }

    /// Останавливает активную генерацию на том же экземпляре провайдера.
    pub async fn stop(&self, _request: StopRequest) -> Result<(), CoreError> {
        self.provider.stop().await
    }

    /// Установка модели с кадрами прогресса и унарным `{ success: true }`.
    pub async fn install(
        &self,
        request: InstallRequest,
        mut on_progress: impl FnMut(InstallProgress),
    ) -> Result<UnarySuccess, CoreError> {
        if request.name.is_empty() {
            return Err(CoreError::Validation {
                message: "name обязателен".to_owned(),
            });
        }
        let provider = self.resolve_provider(&request.id, &request.url)?;
        let mut stream = provider.install_model(&request).await?;
        while let Some(item) = stream.next().await {
            on_progress(item?);
        }
        Ok(UnarySuccess { success: true })
    }

    /// Удаляет модель.
    pub async fn remove(&self, request: RemoveRequest) -> Result<UnarySuccess, CoreError> {
        if request.name.is_empty() {
            return Err(CoreError::Validation {
                message: "name обязателен".to_owned(),
            });
        }
        let provider = self.resolve_provider(&request.id, &request.url)?;
        provider.remove_model(&request).await
    }

    /// Список локальных моделей провайдера.
    pub async fn list(&self, request: ListModelsRequest) -> Result<ListModelsResponse, CoreError> {
        let provider = self.resolve_provider(&request.id, &request.url)?;
        provider.list_models().await
    }

    fn resolve_provider(
        &self,
        id: &Option<String>,
        url: &Option<String>,
    ) -> Result<Arc<dyn LlmProvider>, CoreError> {
        match request_provider_url(url) {
            Some(url) => self.factory.create(request_provider_id(id), url),
            None => Ok(Arc::clone(&self.provider)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;
    use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
    use std::task::{Context, Poll, Waker};

    use async_trait::async_trait;
    use futures_util::stream;

    use crate::domain::events::InstallStatus;
    use crate::domain::host_error::{HostErrorClass, host_error_class};
    use crate::domain::model::dto::{OllamaModel, StopRequest};
    use crate::ports::ProviderStream;

    #[derive(Clone)]
    struct MockProvider {
        id: &'static str,
        generate_calls: Arc<AtomicUsize>,
        list_calls: Arc<AtomicUsize>,
        cancelled: Arc<AtomicBool>,
        waker: Arc<Mutex<Option<Waker>>>,
        hold_after_first: bool,
        list_error: bool,
        models: Vec<OllamaModel>,
    }

    impl MockProvider {
        fn new() -> Self {
            Self {
                id: "ollama",
                generate_calls: Arc::new(AtomicUsize::new(0)),
                list_calls: Arc::new(AtomicUsize::new(0)),
                cancelled: Arc::new(AtomicBool::new(false)),
                waker: Arc::new(Mutex::new(None)),
                hold_after_first: false,
                list_error: false,
                models: vec![OllamaModel {
                    name: "llama".to_owned(),
                    size: 42,
                    modified_at: "2026-01-01T00:00:00Z".to_owned(),
                    digest: None,
                    details: None,
                }],
            }
        }

        fn chunk(response: &str, done: bool) -> GenerateProgress {
            GenerateProgress {
                model: "llama".to_owned(),
                response: response.to_owned(),
                created_at: "t".to_owned(),
                done,
                total_duration: None,
                load_duration: None,
                prompt_eval_duration: None,
                eval_duration: None,
                prompt_eval_count: None,
                eval_count: None,
                context: None,
                extra: Default::default(),
            }
        }
    }

    struct StoppableStream {
        first: Option<GenerateProgress>,
        second: Option<GenerateProgress>,
        cancelled: Arc<AtomicBool>,
        waker: Arc<Mutex<Option<Waker>>>,
        hold_after_first: bool,
        yielded_first: bool,
    }

    impl futures_util::Stream for StoppableStream {
        type Item = Result<GenerateProgress, CoreError>;

        fn poll_next(
            mut self: std::pin::Pin<&mut Self>,
            cx: &mut Context<'_>,
        ) -> Poll<Option<Self::Item>> {
            if self.cancelled.load(Ordering::SeqCst) {
                return Poll::Ready(Some(Err(CoreError::ProviderCancelled)));
            }
            if !self.yielded_first {
                self.yielded_first = true;
                return Poll::Ready(self.first.take().map(Ok));
            }
            if self.hold_after_first {
                *self.waker.lock().expect("waker") = Some(cx.waker().clone());
                return Poll::Pending;
            }
            if let Some(second) = self.second.take() {
                return Poll::Ready(Some(Ok(second)));
            }
            Poll::Ready(None)
        }
    }

    #[async_trait]
    impl LlmProvider for MockProvider {
        fn provider_id(&self) -> &str {
            self.id
        }

        async fn generate_stream(
            &self,
            _request: &GenerateRequest,
        ) -> Result<ProviderStream<GenerateProgress>, CoreError> {
            self.generate_calls.fetch_add(1, Ordering::SeqCst);
            if self.cancelled.load(Ordering::SeqCst) {
                return Err(CoreError::ProviderCancelled);
            }
            Ok(Box::pin(StoppableStream {
                first: Some(Self::chunk("Hello", false)),
                second: Some(Self::chunk(" world", true)),
                cancelled: self.cancelled.clone(),
                waker: self.waker.clone(),
                hold_after_first: self.hold_after_first,
                yielded_first: false,
            }))
        }

        async fn stop(&self) -> Result<(), CoreError> {
            self.cancelled.store(true, Ordering::SeqCst);
            if let Ok(mut slot) = self.waker.lock()
                && let Some(waker) = slot.take()
            {
                waker.wake();
            }
            Ok(())
        }

        async fn list_models(&self) -> Result<ListModelsResponse, CoreError> {
            self.list_calls.fetch_add(1, Ordering::SeqCst);
            if self.list_error {
                return Err(CoreError::HttpNetwork("down".to_owned()));
            }
            Ok(ListModelsResponse {
                models: self.models.clone(),
            })
        }

        async fn install_model(
            &self,
            request: &InstallRequest,
        ) -> Result<ProviderStream<InstallProgress>, CoreError> {
            let frames = vec![
                InstallProgress {
                    status: InstallStatus::Downloading,
                    name: request.name.clone(),
                    size: Some(1),
                    total: Some(2),
                    digest: None,
                    error: None,
                },
                InstallProgress {
                    status: InstallStatus::Complete,
                    name: request.name.clone(),
                    size: Some(2),
                    total: Some(2),
                    digest: None,
                    error: None,
                },
            ];
            Ok(Box::pin(stream::iter(frames.into_iter().map(Ok))))
        }

        async fn remove_model(&self, _request: &RemoveRequest) -> Result<UnarySuccess, CoreError> {
            Ok(UnarySuccess { success: true })
        }
    }

    struct TrackingFactory {
        created: Arc<AtomicUsize>,
        last_url: Arc<Mutex<Option<String>>>,
        override_provider: Arc<MockProvider>,
    }

    impl LlmProviderFactory for TrackingFactory {
        fn create(&self, _provider_id: &str, url: &str) -> Result<Arc<dyn LlmProvider>, CoreError> {
            self.created.fetch_add(1, Ordering::SeqCst);
            *self.last_url.lock().expect("url") = Some(url.to_owned());
            Ok(self.override_provider.clone())
        }
    }

    fn svc(provider: Arc<MockProvider>) -> ModelService {
        let factory = Arc::new(TrackingFactory {
            created: Arc::new(AtomicUsize::new(0)),
            last_url: Arc::new(Mutex::new(None)),
            override_provider: Arc::new(MockProvider::new()),
        });
        ModelService::new(provider, factory)
    }

    fn generate_req(prompt: &str) -> GenerateRequest {
        GenerateRequest {
            model: "llama".to_owned(),
            prompt: prompt.to_owned(),
            system: None,
            temperature: None,
            max_tokens: None,
            num_predict: None,
            think: None,
            context: None,
            id: "ollama".to_owned(),
            url: "http://127.0.0.1:11434".to_owned(),
        }
    }

    #[tokio::test]
    async fn generate_concatenates_two_chunks() {
        let provider = Arc::new(MockProvider::new());
        let svc = svc(provider.clone());
        let mut seen = Vec::new();
        let text = svc
            .generate(generate_req("привет"), |chunk| {
                seen.push(chunk.response.clone())
            })
            .await
            .expect("generate");
        assert_eq!(seen, ["Hello", " world"]);
        assert_eq!(text, "Hello world");
        assert_eq!(provider.generate_calls.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn empty_prompt_does_not_call_provider() {
        let provider = Arc::new(MockProvider::new());
        let svc = svc(provider.clone());
        let mut req = generate_req("");
        req.prompt.clear();
        let err = svc.generate(req, |_| {}).await.expect_err("validation");
        assert!(matches!(err, CoreError::Validation { .. }));
        assert_eq!(provider.generate_calls.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn stop_cancels_in_flight_generate() {
        let mut provider = MockProvider::new();
        provider.hold_after_first = true;
        let provider = Arc::new(provider);
        let svc = svc(provider.clone());
        let (tx, rx) = tokio::sync::oneshot::channel::<()>();
        let tx = std::sync::Mutex::new(Some(tx));
        let generate = {
            let svc = svc.clone();
            tokio::spawn(async move {
                svc.generate(generate_req("привет"), |_| {
                    if let Ok(mut slot) = tx.lock()
                        && let Some(sender) = slot.take()
                    {
                        let _ = sender.send(());
                    }
                })
                .await
            })
        };
        rx.await.expect("first chunk");
        svc.stop(StopRequest {}).await.expect("stop");
        let err = generate.await.expect("join").expect_err("cancelled");
        assert!(matches!(err, CoreError::ProviderCancelled));
        assert_eq!(host_error_class(&err), HostErrorClass::Cancelled);
    }

    #[tokio::test]
    async fn install_remove_list_delegate_to_provider() {
        let provider = Arc::new(MockProvider::new());
        let svc = svc(provider);
        let mut frames = Vec::new();
        let installed = svc
            .install(
                InstallRequest {
                    name: "llama".to_owned(),
                    tag: None,
                    registry: None,
                    insecure: None,
                    id: None,
                    url: None,
                },
                |frame| frames.push(frame.status),
            )
            .await
            .expect("install");
        assert_eq!(installed, UnarySuccess { success: true });
        assert_eq!(
            frames,
            [InstallStatus::Downloading, InstallStatus::Complete]
        );

        let removed = svc
            .remove(RemoveRequest {
                name: "llama".to_owned(),
                id: None,
                url: None,
            })
            .await
            .expect("remove");
        assert_eq!(removed, UnarySuccess { success: true });

        let listed = svc.list(ListModelsRequest::default()).await.expect("list");
        assert_eq!(listed.models[0].name, "llama");
        assert_eq!(listed.models[0].size, 42);
        assert_eq!(listed.models[0].modified_at, "2026-01-01T00:00:00Z");
    }

    #[tokio::test]
    async fn list_with_explicit_url_uses_factory_not_process() {
        let process = Arc::new(MockProvider::new());
        let override_provider = Arc::new(MockProvider {
            id: "override",
            models: vec![OllamaModel {
                name: "remote".to_owned(),
                size: 7,
                modified_at: "2026-02-01T00:00:00Z".to_owned(),
                digest: None,
                details: None,
            }],
            ..MockProvider::new()
        });
        let created = Arc::new(AtomicUsize::new(0));
        let last_url = Arc::new(Mutex::new(None));
        let factory = Arc::new(TrackingFactory {
            created: created.clone(),
            last_url: last_url.clone(),
            override_provider: override_provider.clone(),
        });
        let svc = ModelService::new(process.clone(), factory);

        let listed = svc
            .list(ListModelsRequest {
                id: Some("ollama".to_owned()),
                url: Some("http://10.0.0.5:11434".to_owned()),
            })
            .await
            .expect("list");

        assert_eq!(listed.models[0].name, "remote");
        assert_eq!(created.load(Ordering::SeqCst), 1);
        assert_eq!(
            last_url.lock().expect("url").as_deref(),
            Some("http://10.0.0.5:11434")
        );
        assert_eq!(process.list_calls.load(Ordering::SeqCst), 0);
        assert_eq!(override_provider.list_calls.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn list_without_url_uses_process_provider() {
        let process = Arc::new(MockProvider::new());
        let created = Arc::new(AtomicUsize::new(0));
        let factory = Arc::new(TrackingFactory {
            created: created.clone(),
            last_url: Arc::new(Mutex::new(None)),
            override_provider: Arc::new(MockProvider::new()),
        });
        let svc = ModelService::new(process.clone(), factory);
        let listed = svc.list(ListModelsRequest::default()).await.expect("list");
        assert_eq!(listed.models[0].name, "llama");
        assert_eq!(created.load(Ordering::SeqCst), 0);
        assert_eq!(process.list_calls.load(Ordering::SeqCst), 1);
    }
}
