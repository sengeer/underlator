use std::time::Duration;

use futures_util::StreamExt;
use serde_json::{Value, json};
use wiremock::matchers::{body_json, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

use crate::domain::error::CoreError;
use crate::domain::events::InstallStatus;
use crate::domain::model::dto::{
    DEFAULT_PROVIDER_ID, DEFAULT_PROVIDER_URL, GenerateRequest, InstallRequest, ProviderConfig,
    RemoveRequest,
};

use super::{ProviderFactoryConfig, create_provider};
use crate::ports::LlmProvider;

fn factory_config(id: &str, url: &str, allow_cloud: bool) -> ProviderFactoryConfig {
    ProviderFactoryConfig {
        provider: ProviderConfig {
            id: id.to_owned(),
            url: url.to_owned(),
        },
        allow_cloud,
    }
}

fn generate_request(url: &str) -> GenerateRequest {
    GenerateRequest {
        model: "llama".to_owned(),
        prompt: "привет".to_owned(),
        system: None,
        temperature: None,
        max_tokens: None,
        num_predict: None,
        think: None,
        context: None,
        id: "ollama".to_owned(),
        url: url.to_owned(),
    }
}

#[test]
fn box_dyn_llm_provider_compiles() {
    let provider: Box<dyn LlmProvider> =
        create_provider(&ProviderFactoryConfig::default()).expect("default ollama");
    assert_eq!(provider.provider_id(), DEFAULT_PROVIDER_ID);
}

#[test]
fn default_factory_config_is_local_ollama() {
    let config = ProviderFactoryConfig::default();
    assert_eq!(config.provider.id, "ollama");
    assert_eq!(config.provider.url, DEFAULT_PROVIDER_URL);
    assert!(!config.allow_cloud);
}

#[tokio::test]
async fn local_ids_create_ollama_adapter() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/tags"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "models": [{
                "name": "llama",
                "size": 1,
                "modified_at": "2026-01-01T00:00:00Z"
            }]
        })))
        .mount(&server)
        .await;

    for id in ["ollama", "embedded-ollama", " Ollama "] {
        let provider = create_provider(&factory_config(id, &server.uri(), false))
            .unwrap_or_else(|err| panic!("ожидался адаптер для {id}: {err}"));
        let expected = id.trim().to_ascii_lowercase();
        assert_eq!(provider.provider_id(), expected);
        let listed = provider.list_models().await.expect("list");
        assert_eq!(listed.models[0].name, "llama");
    }
}

#[tokio::test]
async fn unknown_id_is_provider_unknown_without_http() {
    let server = MockServer::start().await;
    let err = match create_provider(&factory_config("unknown", &server.uri(), true)) {
        Err(err) => err,
        Ok(_) => panic!("неизвестный id"),
    };
    match err {
        CoreError::ProviderUnknown { id } => assert_eq!(id, "unknown"),
        other => panic!("ожидался ProviderUnknown, получено {other:?}"),
    }
    let hits = server.received_requests().await.expect("запросы");
    assert!(hits.is_empty(), "неизвестный id не должен ходить в HTTP");
}

#[tokio::test]
async fn cloud_stubs_are_unsupported_without_http() {
    let server = MockServer::start().await;
    for id in ["openrouter", "anthropic"] {
        let provider = create_provider(&factory_config(id, &server.uri(), true))
            .unwrap_or_else(|err| panic!("stub {id}: {err}"));
        assert_eq!(provider.provider_id(), id);

        let generate_err = match provider
            .generate_stream(&generate_request(&server.uri()))
            .await
        {
            Err(err) => err,
            Ok(_) => panic!("generate stub"),
        };
        match generate_err {
            CoreError::ProviderUnsupported { id: got, operation } => {
                assert_eq!(got, id);
                assert_eq!(operation, "generate_stream");
            }
            other => panic!("ожидался ProviderUnsupported, получено {other:?}"),
        }

        let list_err = provider.list_models().await.expect_err("list stub");
        assert!(matches!(
            list_err,
            CoreError::ProviderUnsupported { operation, .. } if operation == "list_models"
        ));

        let install_err = match provider
            .install_model(&InstallRequest {
                name: "m".to_owned(),
                tag: None,
                registry: None,
                insecure: None,
            })
            .await
        {
            Err(err) => err,
            Ok(_) => panic!("install stub"),
        };
        assert!(matches!(
            install_err,
            CoreError::ProviderUnsupported { operation, .. } if operation == "install_model"
        ));

        let remove_err = provider
            .remove_model(&RemoveRequest {
                name: "m".to_owned(),
            })
            .await
            .expect_err("remove stub");
        assert!(matches!(
            remove_err,
            CoreError::ProviderUnsupported { operation, .. } if operation == "remove_model"
        ));
    }
    let hits = server.received_requests().await.expect("запросы");
    assert!(hits.is_empty(), "stub не должен выполнять исходящий HTTP");
}

#[tokio::test]
async fn cloud_without_opt_in_is_disabled_local_does_not_need_opt_in() {
    let server = MockServer::start().await;
    for id in ["openrouter", "anthropic"] {
        let err = match create_provider(&factory_config(id, &server.uri(), false)) {
            Err(err) => err,
            Ok(_) => panic!("облако без opt-in"),
        };
        match err {
            CoreError::ProviderCloudDisabled { id: got } => assert_eq!(got, id),
            other => panic!("ожидался ProviderCloudDisabled, получено {other:?}"),
        }
    }
    let local = create_provider(&factory_config("ollama", &server.uri(), false))
        .expect("локальный Ollama без opt-in");
    assert_eq!(local.provider_id(), "ollama");
    let hits = server.received_requests().await.expect("запросы");
    assert!(hits.is_empty(), "factory не должна ходить в HTTP");
}

#[tokio::test]
async fn generate_stream_two_chunks_without_id_url_in_body() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/api/generate"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(
                    "{\"model\":\"llama\",\"response\":\"при\",\"created_at\":\"t\",\"done\":false}\n\
                     {\"model\":\"llama\",\"response\":\"вет\",\"created_at\":\"t\",\"done\":true}\n",
                )
                .insert_header("Content-Type", "application/x-ndjson"),
        )
        .mount(&server)
        .await;

    let provider = create_provider(&factory_config("ollama", &server.uri(), false)).unwrap();
    let mut stream = provider
        .generate_stream(&generate_request(&server.uri()))
        .await
        .expect("generate");
    let first = stream.next().await.expect("chunk 1").expect("ok");
    assert_eq!(first.response, "при");
    assert!(!first.done);
    let second = stream.next().await.expect("chunk 2").expect("ok");
    assert_eq!(second.response, "вет");
    assert!(second.done);

    let hits = server.received_requests().await.expect("запросы");
    assert_eq!(hits.len(), 1);
    assert_eq!(hits[0].url.path(), "/api/generate");
    let body: Value = serde_json::from_slice(&hits[0].body).expect("json тела");
    assert!(body.get("id").is_none(), "в теле не должно быть id: {body}");
    assert!(
        body.get("url").is_none(),
        "в теле не должно быть url: {body}"
    );
    assert_eq!(body["model"], json!("llama"));
    assert_eq!(body["prompt"], json!("привет"));
    assert_eq!(body["temperature"], json!(0.7));
}

#[tokio::test]
async fn list_models_maps_tags_payload() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/tags"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "models": [{
                "name": "llama",
                "size": 42,
                "modified_at": "2026-09-20T00:00:00Z"
            }]
        })))
        .mount(&server)
        .await;

    let provider = create_provider(&factory_config("ollama", &server.uri(), false)).unwrap();
    let listed = provider.list_models().await.expect("list");
    assert_eq!(listed.models.len(), 1);
    assert_eq!(listed.models[0].name, "llama");
    assert_eq!(listed.models[0].size, 42);
    assert_eq!(listed.models[0].modified_at, "2026-09-20T00:00:00Z");
}

#[tokio::test]
async fn install_model_maps_progress_and_error_frame() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/api/pull"))
        .and(body_json(json!({"name": "llama"})))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(
                    "{\"status\":\"downloading\",\"completed\":10,\"total\":100}\n\
                     {\"status\":\"success\"}\n",
                )
                .insert_header("Content-Type", "application/x-ndjson"),
        )
        .mount(&server)
        .await;

    let provider = create_provider(&factory_config("ollama", &server.uri(), false)).unwrap();
    let request = InstallRequest {
        name: "llama".to_owned(),
        tag: None,
        registry: None,
        insecure: None,
    };
    let mut stream = provider.install_model(&request).await.expect("install");
    let first = stream.next().await.expect("progress").expect("ok");
    assert_eq!(first.status, InstallStatus::Downloading);
    assert_eq!(first.name, "llama");
    assert_eq!(first.size, Some(10));
    assert_eq!(first.total, Some(100));
    let last = stream.next().await.expect("complete").expect("ok");
    assert_eq!(last.status, InstallStatus::Complete);
    assert!(stream.next().await.is_none());

    let err_server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/api/pull"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string("{\"error\":\"file does not exist\"}\n")
                .insert_header("Content-Type", "application/x-ndjson"),
        )
        .mount(&err_server)
        .await;
    let provider = create_provider(&factory_config("ollama", &err_server.uri(), false)).unwrap();
    let mut stream = provider.install_model(&request).await.expect("install err");
    let err = stream
        .next()
        .await
        .expect("кадр ошибки")
        .expect_err("error field");
    assert!(
        matches!(err, CoreError::Internal(ref message) if message.contains("file does not exist")),
        "ожидалась доменная ошибка, получено {err:?}"
    );
}

#[tokio::test]
async fn remove_model_empty_2xx_is_success() {
    let server = MockServer::start().await;
    Mock::given(method("DELETE"))
        .and(path("/api/delete"))
        .respond_with(ResponseTemplate::new(200).set_body_string(""))
        .mount(&server)
        .await;

    let provider = create_provider(&factory_config("ollama", &server.uri(), false)).unwrap();
    let result = provider
        .remove_model(&RemoveRequest {
            name: "llama".to_owned(),
        })
        .await
        .expect("remove");
    assert!(result.success);
}

#[tokio::test]
async fn stop_without_generation_is_ok_and_cancels_in_flight() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/api/generate"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_delay(Duration::from_millis(50))
                .set_body_string(
                    "{\"model\":\"llama\",\"response\":\"один\",\"created_at\":\"t\",\"done\":false}\n\
                     {\"model\":\"llama\",\"response\":\"два\",\"created_at\":\"t\",\"done\":false}\n\
                     {\"model\":\"llama\",\"response\":\"три\",\"created_at\":\"t\",\"done\":true}\n",
                )
                .insert_header("Content-Type", "application/x-ndjson"),
        )
        .mount(&server)
        .await;

    let provider = create_provider(&factory_config("ollama", &server.uri(), false)).unwrap();
    provider.stop().await.expect("stop без генерации");

    let mut stream = provider
        .generate_stream(&generate_request(&server.uri()))
        .await
        .expect("generate");
    let first = stream.next().await.expect("первый chunk").expect("ok");
    assert_eq!(first.response, "один");
    provider.stop().await.expect("stop во время stream");
    match stream.next().await {
        Some(Err(CoreError::ProviderCancelled)) | None => {}
        Some(Ok(chunk)) => panic!(
            "после stop не должно быть новых токенов: {:?}",
            chunk.response
        ),
        Some(Err(other)) => panic!("ожидалась отмена, получено {other:?}"),
    }
    if let Some(item) = stream.next().await {
        match item {
            Err(CoreError::ProviderCancelled) => {}
            Ok(chunk) => panic!("лишний chunk после stop: {:?}", chunk.response),
            Err(other) => panic!("неожиданная ошибка после stop: {other:?}"),
        }
    }
}

#[test]
fn provider_sources_do_not_import_reqwest_or_vendor_health() {
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src/adapters/out/ollama");
    for entry in std::fs::read_dir(&dir).expect("provider dir") {
        let path = entry.expect("entry").path();
        if path.extension().is_none_or(|ext| ext != "rs") {
            continue;
        }
        if path.file_name().is_some_and(|name| name == "tests.rs") {
            continue;
        }
        let text = std::fs::read_to_string(&path).unwrap();
        for needle in ["use reqwest", "use hyper", "reqwest::", "hyper::"] {
            assert!(
                !text.contains(needle),
                "{} не должен импортировать HTTP-crate (`{needle}`)",
                path.display()
            );
        }
        for needle in [
            "/api/embeddings",
            "/api/show",
            "/api/health",
            "generate_embedding",
            "health_check",
        ] {
            assert!(
                !text.contains(needle),
                "{} не должен содержать {needle}",
                path.display()
            );
        }
    }
}

#[test]
fn domain_modules_have_no_use_case_functions() {
    let src = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    for rel in [
        "domain/model/mod.rs",
        "domain/catalog/mod.rs",
        "domain/chat/mod.rs",
    ] {
        let text = std::fs::read_to_string(src.join(rel)).unwrap();
        assert!(
            !text.contains("pub async fn"),
            "{rel} не должен содержать use-case функции"
        );
    }
}

#[test]
fn core_manifest_does_not_depend_on_host_frameworks() {
    let manifest = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/Cargo.toml"));
    for line in manifest
        .lines()
        .filter(|line| !line.trim_start().starts_with('#'))
    {
        let trimmed = line.trim();
        assert!(
            !trimmed.starts_with("tauri"),
            "underlator-core не должен зависеть от tauri"
        );
        assert!(
            !trimmed.starts_with("axum"),
            "underlator-core не должен зависеть от axum"
        );
    }
}

#[test]
fn host_crates_have_no_llm_http_or_mvp_runtime() {
    let crates = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("..");
    // Исходящий LLM HTTP в host запрещён всегда (2.2 / 3.1 / 5.1).
    let llm_http = [
        "reqwest",
        "/api/generate",
        "/api/tags",
        "/api/pull",
        "/api/delete",
    ];
    // Имена Tauri-команд в server запрещены; в tauri (атом 5.1) — обязательны.
    let tauri_cmd_names = ["model_generate", "catalog_get", "chat_create"];
    for name in ["underlator-server", "underlator-tauri"] {
        let src = crates.join(name).join("src");
        visit_rs(&src, &mut |path, text| {
            for needle in llm_http {
                assert!(
                    !text.contains(needle),
                    "{} не должен содержать `{needle}` (LLM HTTP в обход core)",
                    path.display()
                );
            }
            if name == "underlator-server" {
                for needle in tauri_cmd_names {
                    assert!(
                        !text.contains(needle),
                        "{} (server) не должен содержать `{needle}`",
                        path.display()
                    );
                }
            }
        });
    }
}

fn visit_rs(root: &std::path::Path, visit: &mut impl FnMut(&std::path::Path, &str)) {
    if root.is_file() {
        if root.extension().is_some_and(|ext| ext == "rs") {
            let text = std::fs::read_to_string(root).unwrap();
            visit(root, &text);
        }
        return;
    }
    if !root.is_dir() {
        return;
    }
    for entry in std::fs::read_dir(root).unwrap() {
        visit_rs(&entry.unwrap().path(), visit);
    }
}
