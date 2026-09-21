//! Oneshot-тесты HTTP-адаптера: mock-провайдер, memory/fs store, SSE.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll, Waker};

use async_trait::async_trait;
use axum::Router;
use axum::body::Body;
use axum::http::{Method, Request, StatusCode, header};
use futures_util::stream;
use http_body_util::BodyExt;
use serde_json::{Value, json};
use tempfile::tempdir;
use tower::ServiceExt;
use underlator_core::{
    CatalogLibrary, CatalogService, ChatService, CoreError, FilesystemChatStore, GenerateProgress,
    GenerateRequest, InstallProgress, InstallRequest, InstallStatus, ListModelsResponse,
    LlmProvider, MemoryChatStore, ModelService, OllamaModel, ProviderStream, RemoveRequest,
    StorageRoot, UnarySuccess,
};

use crate::config::ServerConfig;
use crate::router;
use crate::state::AppState;

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

struct Harness {
    app: Router,
    provider: Arc<MockProvider>,
}

fn config_from(pairs: &[(&str, &str)]) -> ServerConfig {
    ServerConfig::from_get(|key| {
        pairs
            .iter()
            .find(|(k, _)| *k == key)
            .map(|(_, v)| (*v).to_owned())
    })
}

fn harness_with(
    config: ServerConfig,
    hold: bool,
    store: Arc<dyn underlator_core::ChatStore>,
) -> Harness {
    let mut provider = MockProvider::new();
    provider.hold_after_first = hold;
    let provider = Arc::new(provider);
    let model = ModelService::new(provider.clone());
    let catalog = Arc::new(CatalogService::new(
        provider.clone(),
        Arc::new(EmptyLibrary),
    ));
    let chat = Arc::new(ChatService::new(store));
    let app = router(AppState::new(model, catalog, chat, &config));
    Harness { app, provider }
}

fn harness() -> Harness {
    harness_with(config_from(&[]), false, Arc::new(MemoryChatStore::new()))
}

fn json_request(method: Method, uri: &str, body: Value) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(body.to_string()))
        .expect("request")
}

fn request(method: Method, uri: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .body(Body::empty())
        .expect("request")
}

async fn send(app: Router, req: Request<Body>) -> (StatusCode, String, header::HeaderMap) {
    let response = app.oneshot(req).await.expect("oneshot");
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("body")
        .to_bytes();
    (
        status,
        String::from_utf8_lossy(&bytes).into_owned(),
        headers,
    )
}

fn generate_body(model: &str, prompt: &str) -> Value {
    json!({
        "model": model,
        "prompt": prompt,
        "id": "ollama",
        "url": "http://example.invalid:9"
    })
}

#[tokio::test]
async fn healthz_is_ok_without_ollama() {
    let (status, body, _) = send(harness().app, request(Method::GET, "/healthz")).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, underlator_core::CRATE_NAME);
}

#[tokio::test]
async fn list_without_auth_header_is_401_when_secret_set() {
    let h = harness_with(
        config_from(&[("UNDERLATOR_AUTH_TOKEN", "secret")]),
        false,
        Arc::new(MemoryChatStore::new()),
    );
    let (status, _, _) = send(h.app.clone(), request(Method::GET, "/api/model/list")).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(h.provider.list_calls.load(Ordering::SeqCst), 0);

    let (health_status, _, _) = send(h.app.clone(), request(Method::GET, "/healthz")).await;
    assert_eq!(health_status, StatusCode::OK);

    let req = Request::builder()
        .method(Method::GET)
        .uri("/api/model/list")
        .header(header::AUTHORIZATION, "Bearer secret")
        .body(Body::empty())
        .unwrap();
    let (status, _, _) = send(h.app, req).await;
    assert_ne!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn missing_chat_is_404_not_found_class() {
    let (status, body, _) = send(harness().app, request(Method::GET, "/api/chat/missing")).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let json: Value = serde_json::from_str(&body).expect("json");
    assert_eq!(json["class"], "not_found");
    assert!(json.get("ok").is_none());
}

#[tokio::test]
async fn empty_generate_is_400_json_not_sse() {
    let h = harness();
    let (status, body, headers) = send(
        h.app,
        json_request(Method::POST, "/api/model/generate", generate_body("", "")),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    let ct = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(!ct.contains("text/event-stream"), "{ct}");
    let json: Value = serde_json::from_str(&body).expect("json");
    assert_eq!(json["class"], "invalid");
    assert_eq!(h.provider.generate_calls.load(Ordering::SeqCst), 0);
}

#[tokio::test]
async fn catalog_snapshot_has_contract_keys_and_unknown_model_is_null() {
    let (status, body, _) = send(harness().app.clone(), request(Method::GET, "/api/catalog")).await;
    assert_eq!(status, StatusCode::OK);
    let json: Value = serde_json::from_str(&body).expect("json");
    assert!(json.get("ollama").is_some());
    assert!(json.get("totalCount").is_some());
    assert!(json.get("lastUpdated").is_some());

    let (status, body, _) = send(
        harness().app,
        request(Method::GET, "/api/catalog/models/no-such-model"),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, "null");
}

#[tokio::test]
async fn chat_post_then_get_memory_and_filesystem() {
    let h = harness();
    let (status, body, _) = send(
        h.app.clone(),
        json_request(
            Method::POST,
            "/api/chat",
            json!({"title":"hello","defaultModel":{"name":"llama"}}),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let created: Value = serde_json::from_str(&body).expect("json");
    let id = created["id"].as_str().expect("id");
    assert!(!id.is_empty());
    let (status, body, _) = send(h.app, request(Method::GET, &format!("/api/chat/{id}"))).await;
    assert_eq!(status, StatusCode::OK);
    let got: Value = serde_json::from_str(&body).expect("json");
    assert_eq!(got["id"], id);
    assert_eq!(got["title"], "hello");

    let dir = tempdir().expect("temp");
    let store = FilesystemChatStore::new(StorageRoot::new(dir.path()));
    let h = harness_with(config_from(&[]), false, Arc::new(store));
    let (status, body, _) = send(
        h.app.clone(),
        json_request(
            Method::POST,
            "/api/chat",
            json!({"title":"disk","defaultModel":{"name":"llama"}}),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let created: Value = serde_json::from_str(&body).expect("json");
    let id = created["id"].as_str().expect("id");
    let (status, body, _) = send(h.app, request(Method::GET, &format!("/api/chat/{id}"))).await;
    assert_eq!(status, StatusCode::OK);
    let got: Value = serde_json::from_str(&body).expect("json");
    assert_eq!(got["id"], id);
    assert_eq!(got["title"], "disk");

    let file = dir.path().join("chats").join(format!("{id}.chat.json"));
    assert!(file.is_file(), "ожидался {}", file.display());
}

#[tokio::test]
async fn model_list_and_naming_map_routes_exist() {
    let (status, body, _) = send(
        harness().app.clone(),
        request(Method::GET, "/api/model/list"),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let json: Value = serde_json::from_str(&body).expect("json");
    assert_eq!(json["models"][0]["name"], "llama");
    assert_eq!(json["models"][0]["size"], 42);
    assert_eq!(json["models"][0]["modified_at"], "2026-01-01T00:00:00Z");

    let app = harness().app;
    for op in underlator_core::operations() {
        let path = op
            .http_path
            .replace(":id", "chat_x")
            .replace(":name", "llama");
        let method = match op.http_method {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PATCH" => Method::PATCH,
            "DELETE" => Method::DELETE,
            other => panic!("неизвестный метод {other}"),
        };
        let req = if method == Method::GET || method == Method::DELETE {
            request(method, &path)
        } else {
            json_request(method, &path, json!({}))
        };
        let (status, body, _) = send(app.clone(), req).await;
        assert_ne!(status, StatusCode::METHOD_NOT_ALLOWED, "{} {path}", op.ipc);
        if status == StatusCode::NOT_FOUND {
            assert!(
                body.contains("not_found"),
                "{}: голый 404 без маршрута ({body})",
                op.ipc
            );
        }
    }
}

#[tokio::test]
async fn generate_streams_two_chunks_and_result() {
    let (status, body, headers) = send(
        harness().app,
        json_request(
            Method::POST,
            "/api/model/generate",
            generate_body("llama", "привет"),
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let ct = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(ct.starts_with("text/event-stream"), "{ct}");
    let progress = body.matches("event: model:generate-progress").count();
    assert_eq!(progress, 2, "{body}");
    assert!(body.contains("event: result"), "{body}");
    assert!(
        body.contains("Hello world") || body.contains("\"Hello world\""),
        "{body}"
    );
}

#[tokio::test]
async fn install_streams_progress_then_success() {
    let (status, body, headers) = send(
        harness().app,
        json_request(Method::POST, "/api/model/install", json!({"name":"llama"})),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let ct = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(ct.starts_with("text/event-stream"), "{ct}");
    assert!(body.contains("event: model:install-progress"), "{body}");
    assert!(
        body.contains("\"status\":\"downloading\"") || body.contains("downloading"),
        "{body}"
    );
    assert!(body.contains("event: result"), "{body}");
    assert!(body.contains("\"success\":true"), "{body}");
}

#[tokio::test]
async fn stop_cancels_in_flight_generate() {
    let h = harness_with(config_from(&[]), true, Arc::new(MemoryChatStore::new()));
    let generate = h.app.clone().oneshot(json_request(
        Method::POST,
        "/api/model/generate",
        generate_body("llama", "привет"),
    ));
    let response = generate.await.expect("generate response");
    assert_eq!(response.status(), StatusCode::OK);

    let (stop_status, _, _) = send(h.app.clone(), request(Method::POST, "/api/model/stop")).await;
    assert_ne!(stop_status, StatusCode::NOT_FOUND);
    assert_ne!(stop_status, StatusCode::UNAUTHORIZED);

    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("sse body")
        .to_bytes();
    let body = String::from_utf8_lossy(&bytes);
    let progress = body.matches("event: model:generate-progress").count();
    assert_eq!(progress, 1, "{body}");
    assert!(!body.contains(" world"), "{body}");
}

#[tokio::test]
async fn static_index_when_configured_and_api_without_dir() {
    let dir = tempdir().expect("static");
    std::fs::write(dir.path().join("index.html"), "<html>spa</html>").expect("write");
    let config = ServerConfig::from_get(|key| {
        (key == "UNDERLATOR_STATIC_DIR").then(|| dir.path().to_string_lossy().into_owned())
    });
    let h = harness_with(config, false, Arc::new(MemoryChatStore::new()));
    let (status, body, _) = send(h.app.clone(), request(Method::GET, "/")).await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("spa"), "{body}");
    let (status, _, _) = send(h.app, request(Method::GET, "/healthz")).await;
    assert_eq!(status, StatusCode::OK);

    let (status, _, _) = send(harness().app, request(Method::GET, "/healthz")).await;
    assert_eq!(status, StatusCode::OK);
}

#[test]
fn handlers_do_not_hardcode_ollama_or_bypass_core() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut files = Vec::new();
    collect_rs(&root, &mut files);
    for path in &files {
        let rel = path.strip_prefix(&root).unwrap_or(path);
        let rel = rel.to_string_lossy();
        if rel == "http_tests.rs" {
            continue;
        }
        let text = std::fs::read_to_string(path).expect("read");
        assert!(
            !text.contains(concat!("req", "west")),
            "{rel} не должен импортировать исходящий HTTP-клиент LLM"
        );
        assert!(
            !text.contains("hyper::") && !text.contains("use hyper"),
            "{rel} не должен импортировать hyper"
        );
        if rel.starts_with("routes/") {
            assert!(
                !text.contains("11434"),
                "{rel} не должен хардкодить порт Ollama"
            );
            assert!(
                !text.contains(concat!("\"/api", "/generate\"")),
                "{rel} не должен содержать исходящий URI generate провайдера"
            );
            assert!(
                !text.contains("/api/rag") && !text.contains("rag::"),
                "{rel} не должен объявлять rag"
            );
            assert!(
                !text.contains("/api/splash") && !text.contains("splash::"),
                "{rel} не должен объявлять splash"
            );
        }
        assert!(
            !text.contains("WebSocketUpgrade") && !text.contains("ws::"),
            "{rel} не должен объявлять WebSocket"
        );
    }
}

#[test]
fn tauri_has_no_mvp_commands() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("underlator-tauri")
        .join("src");
    let mut files = Vec::new();
    collect_rs(&root, &mut files);
    for path in files {
        let text = std::fs::read_to_string(&path).expect("read");
        assert!(!text.contains(concat!("model", "_generate")));
        assert!(!text.contains("#[tauri::command]"));
        assert!(!text.contains("invoke_handler"));
    }
}

fn collect_rs(dir: &Path, out: &mut Vec<PathBuf>) {
    let entries = std::fs::read_dir(dir).expect("read_dir");
    for entry in entries {
        let path = entry.expect("entry").path();
        if path.is_dir() {
            collect_rs(&path, out);
        } else if path.extension().and_then(|e| e.to_str()) == Some("rs") {
            out.push(path);
        }
    }
}
