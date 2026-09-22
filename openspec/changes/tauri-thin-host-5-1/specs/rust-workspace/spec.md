# Spec Delta

## MODIFIED Requirements

### Requirement: Tauri host crate stub
The project SHALL provide `crates/underlator-tauri` as the desktop host crate depending on `underlator-core`. After atom 5.1 the crate MUST expose a runnable Tauri 2 host that registers the MVP `model` / `catalog` / `chat` command surface over core (native desktop feature flags MAY gate full WebView runtime on CI machines without GTK/WebKit). The crate MUST remain free of LLM business rules and MUST NOT depend on calling Ollama HTTP outside `underlator-core`.

#### Scenario: Tauri crate depends on core
- **WHEN** `crates/underlator-tauri/Cargo.toml` is inspected
- **THEN** it declares a path dependency on `underlator-core`
- **AND** it MUST NOT add a dependency that lets the host call Ollama HTTP bypassing core

#### Scenario: Desktop host exposes MVP surface
- **WHEN** атом 5.1 завершён и desktop feature/runtime доступны
- **THEN** `underlator-tauri` MUST регистрировать 14 MVP Tauri commands по карте ядра
- **AND** `cargo check --workspace` MUST проходить на машине со scaffold-зависимостями (без обязательного полного WebView в default features, если так зафиксировано в design)
