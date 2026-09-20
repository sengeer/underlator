use std::io::{Read, Write};
use std::net::TcpListener as StdTcpListener;
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::OnceLock;
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::Duration;

use futures_util::StreamExt;
use serde_json::{Value, json};
use tracing::field::{Field, Visit};
use tracing::{Event, Metadata, Subscriber};
use wiremock::matchers::{body_json, header, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

use super::*;
use crate::error::CoreError;

fn fast_retry() -> RetryPolicy {
    RetryPolicy {
        max_attempts: 3,
        base_delay: Duration::from_millis(1),
        backoff_multiplier: 1.0,
        max_delay: Duration::from_millis(5),
    }
}

fn config_for(uri: &str) -> HttpClientConfig {
    HttpClientConfig {
        base_url: uri.to_owned(),
        timeout: Duration::from_secs(5),
        retry: fast_retry(),
        ..Default::default()
    }
}

#[test]
fn client_builds_without_network() {
    let client = HttpClient::new().expect("клиент собирается без I/O");
    let _ = client;
}

#[test]
fn user_agent_uses_crate_identity() {
    assert_eq!(
        user_agent(),
        format!("{}/{}", crate::CRATE_NAME, crate::CRATE_VERSION)
    );
}

#[test]
fn from_config_custom_base_url_debug_hides_bearer() {
    let config = HttpClientConfig {
        base_url: "http://llm.example/custom".to_owned(),
        auth: HttpAuth::Bearer("super-secret-token-abc".to_owned()),
        proxy: Some("http://127.0.0.1:9".to_owned()),
        ..Default::default()
    };
    let debug = format!("{config:?}");
    let client = HttpClient::from_config(config).expect("клиент с custom base_url");
    let _ = client;
    assert!(debug.contains("http://llm.example/custom"));
    assert!(!debug.contains("super-secret-token-abc"));
}

#[test]
fn hyper_is_not_direct_dependency() {
    let manifest = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/Cargo.toml"));
    let direct = manifest
        .lines()
        .filter(|line| !line.trim_start().starts_with('#'))
        .any(|line| {
            let trimmed = line.trim_start();
            trimmed.starts_with("hyper ") || trimmed.starts_with("hyper.") || trimmed == "hyper"
        });
    assert!(
        !direct,
        "hyper не должен быть прямой зависимостью underlator-core"
    );
}

#[tokio::test]
async fn send_json_or_empty_delete_200_empty_body_is_default_success() {
    let server = MockServer::start().await;
    Mock::given(method("DELETE"))
        .and(path("/api/delete"))
        .respond_with(ResponseTemplate::new(200).set_body_string(""))
        .mount(&server)
        .await;

    let client = HttpClient::from_config(config_for(&server.uri())).unwrap();
    let result: crate::model::dto::UnarySuccess = client
        .send_json_or_empty(HttpMethod::Delete, "/api/delete", &json!({"name": "llama"}))
        .await
        .expect("пустой 2xx не должен падать на serde");
    assert!(result.success, "пустой 2xx мапится в успех");
}

#[tokio::test]
async fn send_json_posts_body_and_headers() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/echo"))
        .and(header("Authorization", "Bearer secret-token"))
        .and(header("X-Custom", "yes"))
        .and(body_json(json!({"prompt": "hello"})))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"ok": true})))
        .mount(&server)
        .await;

    let client = HttpClient::from_config(HttpClientConfig {
        default_headers: vec![("X-Custom".to_owned(), "yes".to_owned())],
        auth: HttpAuth::Bearer("secret-token".to_owned()),
        ..config_for(&server.uri())
    })
    .unwrap();

    let response: Value = client
        .send_json(HttpMethod::Post, "/echo", &json!({"prompt": "hello"}))
        .await
        .expect("unary JSON 200");
    assert_eq!(response["ok"], json!(true));
}

#[tokio::test]
async fn http_404_maps_to_status_error() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/missing"))
        .respond_with(ResponseTemplate::new(404).set_body_string("nope"))
        .mount(&server)
        .await;

    let client = HttpClient::from_config(config_for(&server.uri())).unwrap();
    let err = client
        .send_json::<_, Value>(HttpMethod::Post, "/missing", &json!({}))
        .await
        .expect_err("404");
    match err {
        CoreError::HttpStatus { status: 404, .. } => {}
        other => panic!("ожидался HttpStatus 404, получено {other:?}"),
    }
}

#[tokio::test]
async fn unreachable_endpoint_maps_to_network_or_config() {
    let client = HttpClient::from_config(HttpClientConfig {
        base_url: "http://127.0.0.1:9".to_owned(),
        timeout: Duration::from_secs(2),
        retry: RetryPolicy {
            max_attempts: 1,
            ..fast_retry()
        },
        ..Default::default()
    })
    .unwrap();

    let err = client
        .send_json::<_, Value>(HttpMethod::Post, "/x", &json!({}))
        .await
        .expect_err("сеть");
    match err {
        CoreError::HttpNetwork(_) | CoreError::HttpConfig(_) | CoreError::Internal(_) => {}
        other => panic!("ожидался сетевой/инфраструктурный сбой, получено {other:?}"),
    }
}

#[tokio::test]
async fn unary_timeout_maps_to_http_timeout() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/slow"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_delay(Duration::from_secs(2))
                .set_body_json(json!({"ok": true})),
        )
        .mount(&server)
        .await;

    let client = HttpClient::from_config(HttpClientConfig {
        timeout: Duration::from_millis(80),
        retry: RetryPolicy {
            max_attempts: 1,
            ..fast_retry()
        },
        ..config_for(&server.uri())
    })
    .unwrap();

    let err = client
        .send_json::<_, Value>(HttpMethod::Post, "/slow", &json!({}))
        .await
        .expect_err("timeout");
    assert!(
        matches!(err, CoreError::HttpTimeout),
        "ожидался HttpTimeout, получено {err:?}"
    );
}

#[tokio::test]
async fn retries_503_then_succeeds() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/flaky"))
        .respond_with(ResponseTemplate::new(503).set_body_string("busy"))
        .up_to_n_times(1)
        .mount(&server)
        .await;
    Mock::given(method("POST"))
        .and(path("/flaky"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"ok": true})))
        .mount(&server)
        .await;

    let client = HttpClient::from_config(config_for(&server.uri())).unwrap();
    let response: Value = client
        .send_json(HttpMethod::Post, "/flaky", &json!({"n": 1}))
        .await
        .expect("успех после retry");
    assert_eq!(response["ok"], json!(true));
    let hits = server.received_requests().await.expect("запросы");
    assert!(
        hits.len() >= 2,
        "ожидалось ≥2 запросов, было {}",
        hits.len()
    );
}

#[tokio::test]
async fn non_retryable_400_is_single_request() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/bad"))
        .respond_with(ResponseTemplate::new(400).set_body_string("no"))
        .mount(&server)
        .await;

    let client = HttpClient::from_config(config_for(&server.uri())).unwrap();
    let err = client
        .send_json::<_, Value>(HttpMethod::Post, "/bad", &json!({}))
        .await
        .expect_err("400");
    match err {
        CoreError::HttpStatus { status: 400, .. } => {}
        other => panic!("ожидался HttpStatus 400, получено {other:?}"),
    }
    let hits = server.received_requests().await.expect("запросы");
    assert_eq!(hits.len(), 1, "400 не ретраится");
}

#[tokio::test]
async fn ndjson_two_frames_before_need_for_full_body() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/ndjson"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string("{\"a\":1}\n{\"b\":2}\n")
                .insert_header("Content-Type", "application/x-ndjson"),
        )
        .mount(&server)
        .await;

    let client = HttpClient::from_config(config_for(&server.uri())).unwrap();
    let request = HttpRequest::new(HttpMethod::Post, "/ndjson")
        .json(&json!({"stream": true}))
        .unwrap();
    let mut stream = client
        .send_stream(request, StreamMode::NdJson)
        .await
        .expect("stream");
    let first = stream.next().await.expect("первый кадр").expect("ok");
    assert_eq!(first.as_ref(), br#"{"a":1}"#);
    let second = stream.next().await.expect("второй кадр").expect("ok");
    assert_eq!(second.as_ref(), br#"{"b":2}"#);
}

#[tokio::test]
async fn sse_two_data_events() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/sse"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string("data: one\n\ndata: two\n\n")
                .insert_header("Content-Type", "text/event-stream"),
        )
        .mount(&server)
        .await;

    let client = HttpClient::from_config(config_for(&server.uri())).unwrap();
    let mut stream = client
        .send_stream(HttpRequest::new(HttpMethod::Get, "/sse"), StreamMode::Sse)
        .await
        .expect("sse");
    let first = stream.next().await.expect("event 1").expect("ok");
    let second = stream.next().await.expect("event 2").expect("ok");
    assert_eq!(first.as_ref(), b"one");
    assert_eq!(second.as_ref(), b"two");
}

#[tokio::test]
async fn raw_stream_yields_bytes_without_json_parse() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/raw"))
        .respond_with(ResponseTemplate::new(200).set_body_string("not-json-bytes"))
        .mount(&server)
        .await;

    let client = HttpClient::from_config(config_for(&server.uri())).unwrap();
    let mut stream = client
        .send_stream(HttpRequest::new(HttpMethod::Get, "/raw"), StreamMode::Raw)
        .await
        .expect("raw");
    let mut collected = Vec::new();
    while let Some(chunk) = stream.next().await {
        collected.extend_from_slice(&chunk.expect("chunk"));
    }
    assert_eq!(collected, b"not-json-bytes");
}

#[tokio::test]
async fn stream_abort_after_first_frame_is_not_retried() {
    let (base, hits) = spawn_abort_after_first_ndjson_frame();
    let client = HttpClient::from_config(HttpClientConfig {
        retry: RetryPolicy {
            max_attempts: 3,
            ..fast_retry()
        },
        ..config_for(&base)
    })
    .unwrap();

    let mut stream = client
        .send_stream(
            HttpRequest::new(HttpMethod::Post, "/abort")
                .json(&json!({}))
                .unwrap(),
            StreamMode::NdJson,
        )
        .await
        .expect("handshake");
    let first = stream.next().await.expect("кадр").expect("ok");
    assert_eq!(first.as_ref(), br#"{"a":1}"#);
    let err = stream
        .next()
        .await
        .expect("ошибка после кадра")
        .expect_err("обрыв");
    assert!(
        matches!(err, CoreError::HttpStream(_)),
        "ожидался HttpStream, получено {err:?}"
    );
    tokio::time::sleep(Duration::from_millis(50)).await;
    assert_eq!(hits.load(Ordering::SeqCst), 1, "stream не ретраится");
}

#[tokio::test]
async fn default_trace_has_method_without_prompt_or_token() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/trace"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"ok": true})))
        .mount(&server)
        .await;

    let capture = install_global_tracer();
    capture.clear();

    let token = "super-secret-token-xyz";
    let prompt = "UNIQUE_PROMPT_TOKEN_do_not_log";
    let client = HttpClient::from_config(HttpClientConfig {
        auth: HttpAuth::Bearer(token.to_owned()),
        ..config_for(&server.uri())
    })
    .unwrap();

    let _: Value = client
        .send_json(HttpMethod::Post, "/trace", &json!({ "prompt": prompt }))
        .await
        .unwrap();

    let logs = capture.text();
    assert!(
        logs.contains("POST"),
        "трассировка должна содержать метод, логи: {logs}"
    );
    assert!(
        !logs.contains(token),
        "значение токена не должно попадать в лог: {logs}"
    );
    assert!(
        !logs.contains(prompt),
        "текст промпта не должен попадать в лог: {logs}"
    );
    assert!(
        !logs.contains("Authorization"),
        "заголовок Authorization не логируется по умолчанию: {logs}"
    );
}

#[test]
fn use_case_modules_keep_port_boundaries() {
    let src = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    for rel in [
        "model/use_cases.rs",
        "catalog/use_cases.rs",
        "chat/use_cases.rs",
    ] {
        let text = std::fs::read_to_string(src.join(rel)).unwrap_or_else(|err| {
            panic!("не удалось прочитать {rel}: {err}");
        });
        for needle in [
            "use reqwest",
            "use hyper",
            "reqwest::",
            "hyper::",
            "/api/generate",
        ] {
            assert!(
                !text.contains(needle),
                "{rel} не должен содержать `{needle}`"
            );
        }
    }
    let catalog = std::fs::read_to_string(src.join("catalog/use_cases.rs")).unwrap();
    assert!(
        !catalog.contains("ollama-models.zwz.workers.dev"),
        "catalog/use_cases.rs не должен содержать library URL"
    );
    let chat = std::fs::read_to_string(src.join("chat/use_cases.rs")).unwrap();
    assert!(
        !chat.contains("std::fs"),
        "chat/use_cases.rs не должен вызывать std::fs"
    );
}

#[test]
fn domain_modules_do_not_import_reqwest_or_hyper() {
    let src = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let roots = [
        src.join("model"),
        src.join("catalog"),
        src.join("chat"),
        src.join("provider"),
        src.join("contract.rs"),
        src.join("events.rs"),
        src.join("rag.rs"),
        src.join("splash.rs"),
    ];
    let mut files = Vec::new();
    for root in roots {
        collect_rust_files(&root, &mut files);
    }
    assert!(!files.is_empty(), "ожидались исходники доменных модулей");
    for file in files {
        if file.file_name().is_some_and(|name| name == "tests.rs") {
            continue;
        }
        let text = std::fs::read_to_string(&file).unwrap_or_else(|err| {
            panic!("не удалось прочитать {}: {err}", file.display());
        });
        for needle in ["use reqwest", "use hyper", "reqwest::", "hyper::"] {
            assert!(
                !text.contains(needle),
                "{} не должен импортировать reqwest/hyper (найдено `{needle}`)",
                file.display()
            );
        }
    }
}

#[test]
fn http_client_has_no_named_ollama_endpoints() {
    let http_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src/http");
    let mut files = Vec::new();
    collect_rust_files(&http_dir, &mut files);
    for file in files {
        if file.file_name().is_some_and(|name| name == "tests.rs") {
            continue;
        }
        let text = std::fs::read_to_string(&file).unwrap();
        for needle in [
            "pub async fn generate",
            "pub async fn list_models",
            "fn api_generate",
            "fn api_tags",
            "fn api_pull",
            "fn api_delete",
        ] {
            assert!(
                !text.contains(needle),
                "{} не должен содержать именованный вендорный метод (`{needle}`)",
                file.display()
            );
        }
    }
    let client_api = include_str!("mod.rs");
    assert!(
        !client_api.contains("/api/generate"),
        "публичный HTTP-клиент не должен знать путь /api/generate"
    );
}

#[test]
fn public_http_module_does_not_reexport_reqwest() {
    let http_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src/http");
    let mut files = Vec::new();
    collect_rust_files(&http_dir, &mut files);
    for file in files {
        if file.file_name().is_some_and(|name| name == "tests.rs") {
            continue;
        }
        let text = std::fs::read_to_string(&file).unwrap();
        for needle in ["pub use reqwest", "pub use hyper"] {
            assert!(
                !text.contains(needle),
                "{} не должен реэкспортировать HTTP-crate (`{needle}`)",
                file.display()
            );
        }
    }
}

fn collect_rust_files(root: &std::path::Path, out: &mut Vec<std::path::PathBuf>) {
    if root.is_file() {
        if root.extension().is_some_and(|ext| ext == "rs") {
            out.push(root.to_path_buf());
        }
        return;
    }
    if !root.is_dir() {
        return;
    }
    for entry in std::fs::read_dir(root).expect("read_dir") {
        let path = entry.expect("entry").path();
        if path.is_dir() {
            collect_rust_files(&path, out);
        } else if path.extension().is_some_and(|ext| ext == "rs") {
            out.push(path);
        }
    }
}

#[derive(Clone, Default)]
struct Capture(Arc<Mutex<Vec<u8>>>);

impl Capture {
    fn text(&self) -> String {
        String::from_utf8_lossy(&self.0.lock().expect("capture")).into_owned()
    }

    fn clear(&self) {
        self.0.lock().expect("capture").clear();
    }
}

fn install_global_tracer() -> Capture {
    static TRACER: OnceLock<Capture> = OnceLock::new();
    TRACER
        .get_or_init(|| {
            let capture = Capture::default();
            let _ = tracing::subscriber::set_global_default(TracingCapture(capture.clone()));
            tracing::callsite::rebuild_interest_cache();
            capture
        })
        .clone()
}

struct TracingCapture(Capture);

impl Subscriber for TracingCapture {
    fn enabled(&self, _metadata: &Metadata<'_>) -> bool {
        true
    }

    fn register_callsite(
        &self,
        _metadata: &'static Metadata<'static>,
    ) -> tracing::subscriber::Interest {
        tracing::subscriber::Interest::always()
    }

    fn new_span(&self, _span: &tracing::span::Attributes<'_>) -> tracing::span::Id {
        tracing::span::Id::from_u64(1)
    }

    fn record(&self, _span: &tracing::span::Id, _values: &tracing::span::Record<'_>) {}

    fn record_follows_from(&self, _span: &tracing::span::Id, _follows: &tracing::span::Id) {}

    fn event(&self, event: &Event<'_>) {
        let mut line = String::from(event.metadata().name());
        event.record(&mut FieldDump(&mut line));
        line.push('\n');
        self.0
            .0
            .lock()
            .expect("capture")
            .extend_from_slice(line.as_bytes());
    }

    fn enter(&self, _span: &tracing::span::Id) {}

    fn exit(&self, _span: &tracing::span::Id) {}
}

struct FieldDump<'a>(&'a mut String);

impl Visit for FieldDump<'_> {
    fn record_debug(&mut self, field: &Field, value: &dyn std::fmt::Debug) {
        self.0.push(' ');
        self.0.push_str(field.name());
        self.0.push('=');
        self.0.push_str(&format!("{value:?}"));
    }

    fn record_str(&mut self, field: &Field, value: &str) {
        self.0.push(' ');
        self.0.push_str(field.name());
        self.0.push('=');
        self.0.push_str(value);
    }

    fn record_u64(&mut self, field: &Field, value: u64) {
        self.record_debug(field, &value);
    }

    fn record_i64(&mut self, field: &Field, value: i64) {
        self.record_debug(field, &value);
    }

    fn record_bool(&mut self, field: &Field, value: bool) {
        self.record_debug(field, &value);
    }
}

fn spawn_abort_after_first_ndjson_frame() -> (String, Arc<AtomicU32>) {
    let listener = StdTcpListener::bind("127.0.0.1:0").expect("bind");
    listener.set_nonblocking(false).expect("blocking");
    let addr = listener.local_addr().expect("addr");
    let hits = Arc::new(AtomicU32::new(0));
    let hits_clone = hits.clone();
    std::thread::spawn(move || {
        loop {
            let Ok((mut sock, _)) = listener.accept() else {
                break;
            };
            hits_clone.fetch_add(1, Ordering::SeqCst);
            let mut buf = [0_u8; 4096];
            let _ = sock.read(&mut buf);
            let body = "{\"a\":1}\n";
            let resp = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/x-ndjson\r\nContent-Length: 1000\r\nConnection: close\r\n\r\n{body}"
            );
            let _ = sock.write_all(resp.as_bytes());
            let _ = sock.flush();
            drop(sock);
        }
    });
    (format!("http://{addr}"), hits)
}
