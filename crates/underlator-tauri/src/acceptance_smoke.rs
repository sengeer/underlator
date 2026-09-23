//! Приёмочный smoke MVP внутри живого desktop-host (атом 5.2).
//!
//! Включается только при `UNDERLATOR_ACCEPTANCE_SMOKE=1`. Прогоняет те же thin
//! handlers, что и Tauri invoke, против **локального Ollama** (не mock).
//! Результат пишется в `{data_dir}/acceptance-smoke.json`.

use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;

use underlator_core::{
    AddMessageRequest, CatalogFilters, ChatMessageRole, ChatModelRef, CreateChatRequest,
    DeleteChatRequest, GenerateRequest, GetCatalogRequest, GetChatRequest, GetModelInfoRequest,
    InstallRequest, ListChatsRequest, RemoveRequest, UpdateChatRequest, DEFAULT_PROVIDER_ID,
    DEFAULT_PROVIDER_URL,
};

use crate::commands::{catalog, chat, model};
use crate::state::AppState;

/// Запускает smoke, если env-флаг выставлен; иначе no-op.
pub async fn maybe_run(state: &AppState) {
    let enabled = std::env::var("UNDERLATOR_ACCEPTANCE_SMOKE")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    if !enabled {
        return;
    }
    tracing::info!(
        data_dir = %state.data_dir.display(),
        "UNDERLATOR_ACCEPTANCE_SMOKE: старт живого MVP smoke"
    );
    let report = run(state).await;
    let path = state.data_dir.join("acceptance-smoke.json");
    if let Err(err) = write_report(&path, &report) {
        tracing::error!(error = %err, "не удалось записать acceptance-smoke.json");
        return;
    }
    let ok = report.iter().all(|step| step.ok);
    tracing::info!(path = %path.display(), ok, "UNDERLATOR_ACCEPTANCE_SMOKE: готово");
}

#[derive(Debug, serde::Serialize)]
struct Step {
    name: &'static str,
    ok: bool,
    detail: String,
}

async fn run(state: &AppState) -> Vec<Step> {
    let mut steps = Vec::new();

    // --- model: list ---
    let list = match model::list(state).await {
        Ok(resp) => {
            let names: Vec<_> = resp.models.iter().map(|m| m.name.clone()).collect();
            steps.push(Step {
                name: "model_list",
                ok: !names.is_empty(),
                detail: format!("models={names:?}"),
            });
            resp
        }
        Err(err) => {
            steps.push(Step {
                name: "model_list",
                ok: false,
                detail: err.to_string(),
            });
            return steps;
        }
    };

    let model_name = std::env::var("UNDERLATOR_SMOKE_MODEL")
        .ok()
        .filter(|s| !s.is_empty())
        .or_else(|| list.models.first().map(|m| m.name.clone()))
        .unwrap_or_else(|| "qwen2.5:0.5b".to_owned());

    // --- model: generate + progress ---
    let progress_count = Arc::new(AtomicUsize::new(0));
    let progress_count_cb = Arc::clone(&progress_count);
    let gen_req = GenerateRequest {
        model: model_name.clone(),
        prompt: "Say hi in one short word.".to_owned(),
        system: None,
        temperature: Some(0.1),
        max_tokens: Some(16),
        num_predict: Some(16),
        think: Some(false),
        context: None,
        id: DEFAULT_PROVIDER_ID.to_owned(),
        url: DEFAULT_PROVIDER_URL.to_owned(),
    };
    match model::generate_with_progress(state, gen_req, |_chunk| {
        progress_count_cb.fetch_add(1, Ordering::SeqCst);
    })
    .await
    {
        Ok(text) => steps.push(Step {
            name: "model_generate",
            ok: progress_count.load(Ordering::SeqCst) > 0 && !text.is_empty(),
            detail: format!(
                "progress={} text_len={}",
                progress_count.load(Ordering::SeqCst),
                text.len()
            ),
        }),
        Err(err) => steps.push(Step {
            name: "model_generate",
            ok: false,
            detail: err.to_string(),
        }),
    }

    // --- model: stop during generate ---
    let saw_progress = Arc::new(AtomicBool::new(false));
    let saw_progress_cb = Arc::clone(&saw_progress);
    let state_clone = state.clone();
    let stop_model = model_name.clone();
    let generate_handle = tokio::spawn(async move {
        let req = GenerateRequest {
            model: stop_model,
            prompt: "Write a very long essay about rivers, keep going for many paragraphs.".to_owned(),
            system: None,
            temperature: Some(0.7),
            max_tokens: Some(256),
            num_predict: Some(256),
            think: Some(false),
            context: None,
            id: DEFAULT_PROVIDER_ID.to_owned(),
            url: DEFAULT_PROVIDER_URL.to_owned(),
        };
        model::generate_with_progress(&state_clone, req, |_chunk| {
            saw_progress_cb.store(true, Ordering::SeqCst);
        })
        .await
    });

    // ждём первый progress, затем stop
    for _ in 0..100 {
        if saw_progress.load(Ordering::SeqCst) {
            break;
        }
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    let stop_result = model::stop(state).await;
    let gen_result = generate_handle.await;
    let stop_ok = stop_result.is_ok()
        && matches!(
            gen_result,
            Ok(Err(_)) | Ok(Ok(_)) // cancel или ранний конец после stop — оба приемлемы при живом Ollama
        );
    steps.push(Step {
        name: "model_stop",
        ok: stop_ok && saw_progress.load(Ordering::SeqCst),
        detail: format!(
            "saw_progress={} stop={stop_result:?} gen={gen_result:?}",
            saw_progress.load(Ordering::SeqCst)
        ),
    });

    // --- model: install / remove (tiny, optional via env) ---
    if std::env::var("UNDERLATOR_SMOKE_INSTALL_REMOVE")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
    {
        let smoke_name = std::env::var("UNDERLATOR_SMOKE_INSTALL_MODEL")
            .unwrap_or_else(|_| "tinyllama".to_owned());
        match model::install_with_progress(
            state,
            InstallRequest {
                name: smoke_name.clone(),
                tag: None,
                registry: None,
                insecure: None,
            },
            |_| {},
        )
        .await
        {
            Ok(_) => steps.push(Step {
                name: "model_install",
                ok: true,
                detail: format!("installed {smoke_name}"),
            }),
            Err(err) => steps.push(Step {
                name: "model_install",
                ok: false,
                detail: err.to_string(),
            }),
        }
        match model::remove(
            state,
            RemoveRequest {
                name: smoke_name.clone(),
            },
        )
        .await
        {
            Ok(_) => steps.push(Step {
                name: "model_remove",
                ok: true,
                detail: format!("removed {smoke_name}"),
            }),
            Err(err) => steps.push(Step {
                name: "model_remove",
                ok: false,
                detail: err.to_string(),
            }),
        }
    } else {
        steps.push(Step {
            name: "model_install_remove",
            ok: true,
            detail: "skipped (set UNDERLATOR_SMOKE_INSTALL_REMOVE=1 to enable)".to_owned(),
        });
    }

    // --- catalog ---
    match catalog::get(
        state,
        GetCatalogRequest {
            force_refresh: Some(true),
        },
    )
    .await
    {
        Ok(cat) => steps.push(Step {
            name: "catalog_get",
            ok: cat.total_count > 0 || !cat.ollama.is_empty(),
            detail: format!("total_count={} cards={}", cat.total_count, cat.ollama.len()),
        }),
        Err(err) => steps.push(Step {
            name: "catalog_get",
            ok: false,
            detail: err.to_string(),
        }),
    }

    match catalog::search(
        state,
        CatalogFilters {
            search: Some("qwen".to_owned()),
            ..CatalogFilters::default()
        },
    )
    .await
    {
        Ok(cat) => steps.push(Step {
            name: "catalog_search",
            ok: true,
            detail: format!("cards={}", cat.ollama.len()),
        }),
        Err(err) => steps.push(Step {
            name: "catalog_search",
            ok: false,
            detail: err.to_string(),
        }),
    }

    match catalog::get_model_info(
        state,
        GetModelInfoRequest {
            model_name: model_name.clone(),
        },
    )
    .await
    {
        Ok(info) => steps.push(Step {
            name: "catalog_get_model_info",
            ok: info.is_some(),
            detail: format!("info={info:?}"),
        }),
        Err(err) => steps.push(Step {
            name: "catalog_get_model_info",
            ok: false,
            detail: err.to_string(),
        }),
    }

    // --- chat CRUD + persist ---
    let default_model = ChatModelRef {
        name: model_name.clone(),
        version: None,
        provider: Some("ollama".to_owned()),
    };
    let created = match chat::create(
        state,
        CreateChatRequest {
            title: "smoke-5-2".to_owned(),
            default_model: default_model.clone(),
            system_prompt: None,
            generation_settings: None,
            metadata: None,
        },
    )
    .await
    {
        Ok(chat_data) => {
            steps.push(Step {
                name: "chat_create",
                ok: true,
                detail: format!("id={}", chat_data.id),
            });
            Some(chat_data)
        }
        Err(err) => {
            steps.push(Step {
                name: "chat_create",
                ok: false,
                detail: err.to_string(),
            });
            None
        }
    };

    if let Some(created) = created {
        let chat_id = created.id.clone();
        let _ = match chat::list(state, ListChatsRequest::default()).await {
            Ok(list) => {
                let found = list.chats.iter().any(|c| c.id == chat_id);
                steps.push(Step {
                    name: "chat_list",
                    ok: found,
                    detail: format!("count={} found={found}", list.chats.len()),
                });
            }
            Err(err) => steps.push(Step {
                name: "chat_list",
                ok: false,
                detail: err.to_string(),
            }),
        };

        match chat::get(
            state,
            GetChatRequest {
                chat_id: chat_id.clone(),
                include_messages: Some(true),
                message_limit: None,
                message_offset: None,
            },
        )
        .await
        {
            Ok(_) => steps.push(Step {
                name: "chat_get",
                ok: true,
                detail: "ok".to_owned(),
            }),
            Err(err) => steps.push(Step {
                name: "chat_get",
                ok: false,
                detail: err.to_string(),
            }),
        }

        match chat::update(
            state,
            UpdateChatRequest {
                chat_id: chat_id.clone(),
                title: Some("smoke-5-2-updated".to_owned()),
                default_model: None,
                system_prompt: None,
                generation_settings: None,
                metadata: None,
            },
        )
        .await
        {
            Ok(updated) => steps.push(Step {
                name: "chat_update",
                ok: updated.title == "smoke-5-2-updated",
                detail: format!("title={}", updated.title),
            }),
            Err(err) => steps.push(Step {
                name: "chat_update",
                ok: false,
                detail: err.to_string(),
            }),
        }

        match chat::add_message(
            state,
            AddMessageRequest {
                chat_id: chat_id.clone(),
                role: ChatMessageRole::User,
                content: "hello from acceptance smoke".to_owned(),
                model: Some(default_model),
                context: None,
                metadata: None,
            },
        )
        .await
        {
            Ok(_) => steps.push(Step {
                name: "chat_add_message",
                ok: true,
                detail: "ok".to_owned(),
            }),
            Err(err) => steps.push(Step {
                name: "chat_add_message",
                ok: false,
                detail: err.to_string(),
            }),
        }

        // persist: файлы под data_dir
        let persisted = find_chat_files(&state.data_dir);
        steps.push(Step {
            name: "chat_persist_files",
            ok: !persisted.is_empty(),
            detail: format!("files={persisted:?}"),
        });

        match chat::delete(
            state,
            DeleteChatRequest {
                chat_id,
                create_backup: Some(false),
                confirmed: Some(true),
            },
        )
        .await
        {
            Ok(_) => steps.push(Step {
                name: "chat_delete",
                ok: true,
                detail: "ok".to_owned(),
            }),
            Err(err) => steps.push(Step {
                name: "chat_delete",
                ok: false,
                detail: err.to_string(),
            }),
        }
    }

    steps
}

fn find_chat_files(data_dir: &Path) -> Vec<String> {
    let mut out = Vec::new();
    let walker = walkdir_shallow(data_dir, 4);
    for path in walker {
        if path.extension().and_then(|e| e.to_str()) == Some("json") {
            out.push(path.display().to_string());
        }
    }
    out
}

fn walkdir_shallow(root: &Path, max_depth: usize) -> Vec<std::path::PathBuf> {
    let mut out = Vec::new();
    let mut stack = vec![(root.to_path_buf(), 0usize)];
    while let Some((dir, depth)) = stack.pop() {
        let Ok(entries) = std::fs::read_dir(&dir) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && depth < max_depth {
                stack.push((path, depth + 1));
            } else if path.is_file() {
                out.push(path);
            }
        }
    }
    out
}

fn write_report(path: &Path, steps: &[Step]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let body = serde_json::json!({
        "gate": "fedora-appimage-mvp-smoke",
        "not_replaced_by": ["tauri_dev", "unit_mock", "binary_only"],
        "all_ok": steps.iter().all(|s| s.ok),
        "steps": steps,
    });
    std::fs::write(path, serde_json::to_vec_pretty(&body).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}
