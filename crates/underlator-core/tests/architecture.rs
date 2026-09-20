//! Архитектурный gate границ слоёв `underlator-core`.
//!
//! `arch_lint::check!()` проверяет `use` и inline-пути по `arch-lint.toml`.
//!
//! # Negative-сценарий
//!
//! Добавление в слой `application` импорта исходящего адаптера, например
//! `use crate::adapters::out::ollama::OllamaProvider` или
//! `use crate::adapters::out::fs::FilesystemChatStore`, MUST делать
//! `cargo test -p underlator-core` неуспешным: сработает `arch_lint::check!()`
//! (`deny-scope-dep` application → adapters) и regression-скан ниже.

arch_lint::check!(config = "crates/underlator-core/arch-lint.toml");

/// Слой `application` не называет adapters, HTTP-crate и вендорный `/api/generate`.
#[test]
fn application_sources_do_not_name_adapters_or_http_crates() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src/application");
    let mut files = Vec::new();
    collect_rust_files(&root, &mut files);
    for file in files {
        let text = std::fs::read_to_string(&file).unwrap_or_else(|err| {
            panic!("не удалось прочитать {}: {err}", file.display());
        });
        for needle in ["crate::adapters", "reqwest", "hyper", "/api/generate"] {
            assert!(
                !text.contains(needle),
                "{} не должен содержать `{needle}`",
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
    for entry in std::fs::read_dir(root).expect("read_dir application") {
        let path = entry.expect("entry").path();
        if path.is_dir() {
            collect_rust_files(&path, out);
        } else if path.extension().is_some_and(|ext| ext == "rs") {
            out.push(path);
        }
    }
}
