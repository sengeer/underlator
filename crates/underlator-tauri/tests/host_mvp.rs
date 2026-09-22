//! Oneshot-тесты driving adapter без WebView: mock-провайдер + fs store.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll, Waker};

use async_trait::async_trait;
use futures_util::stream;
use tempfile::tempdir;
use underlator_core::{
    CatalogLibrary, CatalogService, ChatMessageRole, ChatModelRef, ChatService, CoreError,
    CreateChatRequest, FilesystemChatStore, GenerateProgress, GenerateRequest, GetChatRequest,
    GetModelInfoRequest, InstallProgress, InstallRequest, InstallStatus, ListModelsResponse,
    LlmProvider, ModelService, OllamaModel, ProviderStream, RemoveRequest, StorageRoot,
    UnarySuccess,
};

use underlator_tauri::commands::{catalog, chat, model};
use underlator_tauri::config::DesktopConfig;
use underlator_tauri::state::AppState;

struct MockProvider {
    generate_calls: AtomicUsize,
    list_calls: AtomicUsize,
    cancelled: Arc<AtomicBool>,
    hold_after_first: bool,
    waker: Arc<Mutex<Option<Waker>>>,
    models: Vec<OllamaModel>,
}

impl MockProvider {
    fn new() -> Self {
        Self {
            generate_calls: AtomicUsize::new(0),
            list_calls: AtomicUsize::new(0),
            cancelled: Arc::new(AtomicBool::new(false)),
            hold_after_first: false,
            waker: Arc::new(Mutex::new(None)),
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
        "ollama"
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
            cancelled: Arc::clone(&self.cancelled),
            waker: Arc::clone(&self.waker),
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

struct EmptyLibrary;

#[async_trait]
impl CatalogLibrary for EmptyLibrary {
    async fn fetch_models(&self) -> Result<Vec<underlator_core::OllamaModelInfo>, CoreError> {
        Ok(Vec::new())
    }
}

fn harness(data_dir: PathBuf, hold: bool) -> (AppState, Arc<MockProvider>) {
    let mut provider = MockProvider::new();
    provider.hold_after_first = hold;
    let provider = Arc::new(provider);
    let model = ModelService::new(provider.clone());
    let catalog = Arc::new(CatalogService::new(
        provider.clone(),
        Arc::new(EmptyLibrary),
    ));
    let store = FilesystemChatStore::new(StorageRoot::new(&data_dir));
    let chat = Arc::new(ChatService::new(Arc::new(store)));
    (
        AppState::new(model, catalog, chat, data_dir),
        provider,
    )
}

fn gen_req(model: &str, prompt: &str) -> GenerateRequest {
    GenerateRequest {
        model: model.to_owned(),
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
async fn model_list_remove_stop_share_provider_arc() {
    let dir = tempdir().expect("temp");
    let (state, provider) = harness(dir.path().to_path_buf(), false);

    let listed = model::list(&state).await.expect("list");
    assert_eq!(listed.models.len(), 1);
    assert_eq!(provider.list_calls.load(Ordering::SeqCst), 1);

    let removed = model::remove(
        &state,
        RemoveRequest {
            name: "llama".to_owned(),
        },
    )
    .await
    .expect("remove");
    assert!(removed.success);

    model::stop(&state).await.expect("stop");
    assert!(provider.cancelled.load(Ordering::SeqCst));
}

#[tokio::test]
async fn generate_emits_progress_and_concatenates() {
    let dir = tempdir().expect("temp");
    let (state, _) = harness(dir.path().to_path_buf(), false);
    let frames = Arc::new(Mutex::new(Vec::new()));
    let frames_cb = Arc::clone(&frames);

    let text = model::generate_with_progress(&state, gen_req("llama", "hi"), |chunk| {
        frames_cb.lock().expect("lock").push(chunk.response.clone());
    })
    .await
    .expect("generate");

    assert_eq!(text, "Hello world");
    let got = frames.lock().expect("lock");
    assert!(got.len() >= 2, "ожидалось ≥2 progress-кадра, got {}", got.len());
}

#[tokio::test]
async fn empty_prompt_is_classified_without_success() {
    let dir = tempdir().expect("temp");
    let (state, _) = harness(dir.path().to_path_buf(), false);
    let err = model::generate_with_progress(&state, gen_req("llama", ""), |_| {})
        .await
        .expect_err("empty prompt");
    assert_eq!(err.class, "invalid");
}

#[tokio::test]
async fn install_emits_progress_frames() {
    let dir = tempdir().expect("temp");
    let (state, _) = harness(dir.path().to_path_buf(), false);
    let frames = Arc::new(Mutex::new(Vec::new()));
    let frames_cb = Arc::clone(&frames);

    let ok = model::install_with_progress(
        &state,
        InstallRequest {
            name: "llama".to_owned(),
            tag: None,
            registry: None,
            insecure: None,
        },
        |frame| {
            frames_cb.lock().expect("lock").push(frame.status);
        },
    )
    .await
    .expect("install");
    assert!(ok.success);
    assert!(frames.lock().expect("lock").len() >= 2);
}

#[tokio::test]
async fn stop_cancels_in_flight_generate() {
    let dir = tempdir().expect("temp");
    let (state, provider) = harness(dir.path().to_path_buf(), true);

    let state_stop = state.clone();
    let generate = tokio::spawn(async move {
        model::generate_with_progress(&state_stop, gen_req("llama", "hi"), |_| {}).await
    });

    // Дождаться первого кадра (hold) и остановить.
    for _ in 0..50 {
        if provider.waker.lock().expect("w").is_some() {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    }
    model::stop(&state).await.expect("stop");
    let result = generate.await.expect("join");
    assert!(result.is_err());
    assert_eq!(result.expect_err("cancelled").class, "cancelled");
}

#[tokio::test]
async fn catalog_unknown_model_returns_null() {
    let dir = tempdir().expect("temp");
    let (state, _) = harness(dir.path().to_path_buf(), false);
    let info = catalog::get_model_info(
        &state,
        GetModelInfoRequest {
            model_name: "no-such-model".to_owned(),
        },
    )
    .await
    .expect("info");
    assert!(info.is_none());

    let cat = catalog::get(&state, Default::default()).await.expect("get");
    let json = serde_json::to_value(&cat).expect("json");
    assert!(json.get("ollama").is_some());
    assert!(json.get("totalCount").is_some());
    assert!(json.get("lastUpdated").is_some());
}

#[tokio::test]
async fn chat_create_get_persists_under_data_dir() {
    let dir = tempdir().expect("temp");
    let data = dir.path().to_path_buf();
    let (state, _) = harness(data.clone(), false);

    let created = chat::create(
        &state,
        CreateChatRequest {
            title: "t".to_owned(),
            default_model: ChatModelRef {
                name: "llama".to_owned(),
                version: None,
                provider: None,
            },
            system_prompt: None,
            generation_settings: None,
            metadata: None,
        },
    )
    .await
    .expect("create");

    let got = chat::get(
        &state,
        GetChatRequest {
            chat_id: created.id.clone(),
            include_messages: Some(true),
            message_limit: None,
            message_offset: None,
        },
    )
    .await
    .expect("get");
    assert_eq!(got.id, created.id);
    assert_eq!(got.title, "t");

    let file = data.join("chats").join(format!("{}.chat.json", created.id));
    assert!(file.is_file(), "ожидался {}", file.display());
}

#[tokio::test]
async fn chat_missing_id_is_not_found() {
    let dir = tempdir().expect("temp");
    let (state, _) = harness(dir.path().to_path_buf(), false);
    let err = chat::get(
        &state,
        GetChatRequest {
            chat_id: "missing".to_owned(),
            include_messages: None,
            message_limit: None,
            message_offset: None,
        },
    )
    .await
    .expect_err("missing");
    assert_eq!(err.class, "not_found");
}

#[tokio::test]
async fn resolve_data_dir_prefers_override_not_docker_data() {
    let config = DesktopConfig::from_get(|key| {
        (key == "UNDERLATOR_DATA_DIR").then(|| "/tmp/desktop-override".to_owned())
    });
    let resolved =
        AppState::resolve_data_dir(&config, PathBuf::from("/data"));
    assert_eq!(resolved, PathBuf::from("/tmp/desktop-override"));
    assert_ne!(
        DesktopConfig::from_get(|_| None).provider.url,
        "http://ollama:11434"
    );
}

#[tokio::test]
async fn add_message_roundtrip() {
    let dir = tempdir().expect("temp");
    let (state, _) = harness(dir.path().to_path_buf(), false);
    let created = chat::create(
        &state,
        CreateChatRequest {
            title: "m".to_owned(),
            default_model: ChatModelRef {
                name: "llama".to_owned(),
                version: None,
                provider: None,
            },
            system_prompt: None,
            generation_settings: None,
            metadata: None,
        },
    )
    .await
    .expect("create");

    let added = chat::add_message(
        &state,
        underlator_core::AddMessageRequest {
            chat_id: created.id.clone(),
            role: ChatMessageRole::User,
            content: "hello".to_owned(),
            model: None,
            context: None,
            metadata: None,
        },
    )
    .await
    .expect("add");
    assert!(!added.message.id.is_empty());
}
