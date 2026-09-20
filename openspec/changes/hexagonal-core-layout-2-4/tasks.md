# Tasks

## 1. Architecture linter (сначала)

- [x] 1.1 Добавить `arch-lint` как **dev-dependency** `underlator-core` (не runtime); проверить, что его нет в `[dependencies]` и `cargo metadata -p underlator-core --format-version 1` видит dev-dep
- [x] 1.2 Создать `crates/underlator-core/arch-lint.toml`: `preset = "minimal"` (не `recommended`/`strict`); scopes `domain` / `ports` / `application` / `adapters` / `composition`; `[[deny-scope-dep]]` по матрице из design.md; `[[restrict-use]]` для `reqwest::*` и `hyper::*` вне HTTP-адаптера (`except` путь `src/adapters/out/http/**`); проверить, что файл существует и **нет** `[[layering]]` как единственной модели гексагона
- [x] 1.3 Добавить `crates/underlator-core/tests/architecture.rs` с `arch_lint::check!(config = "arch-lint.toml")` и rustdoc на русском: запрещённый `application` → `adapters` MUST валить `cargo test`; проверить, что файл компилируется (`cargo test -p underlator-core --test architecture --no-run`)
- [x] 1.4 В том же `architecture.rs` добавить regression-скан исходников `application/**`: нет `crate::adapters`, `reqwest`, `hyper`, `/api/generate`; проверить, что тест существует (после переезда в §2 он станет зелёным вместе с линтером)

## 2. Раскладка слоёв (после конфига линтера)

- [x] 2.1 Создать дерево `src/domain/`, `src/ports/`, `src/application/`, `src/adapters/out/` с `mod.rs` и rustdoc на русском; подключить модули из `lib.rs` как composition root; проверить `ls` целевых каталогов и что у корня `src/` больше нет обязательных `pub mod http` / `provider` / `model` / `catalog` / `chat` как домов реализации
- [x] 2.2 Перенести в `domain/`: `error`, `host_error`, `events`, `iso8601`, `contract`, заготовки `rag`/`splash`, DTO `model`/`catalog`/`chat`, `static_library_models`; проверить, что domain-файлы не содержат `reqwest`/`hyper`/`std::fs` IO (`rg`)
- [x] 2.3 Перенести в `ports/`: `LlmProvider`, `CatalogLibrary`, `ChatStore`, `StorageRoot` (без `FilesystemChatStore` / `HttpCatalogLibrary` / `OllamaProvider`); проверить, что `ports` не импортирует `adapters` (`rg`)
- [x] 2.4 Перенести use-cases в `application/` (`ModelService`, `CatalogService`, `ChatService` + `Clock`/`IdGenerator`); убрать импорт `static_library_models` из adapter-модуля (брать из domain); проверить, что `application` не импортирует `adapters` и не содержит `/api/generate`
- [x] 2.5 Перенести исходящие адаптеры: `http/` → `adapters/out/http/`; Ollama + stubs + factory/config → `adapters/out/ollama/`; `HttpCatalogLibrary` → `adapters/out/`; `FilesystemChatStore` и `MemoryChatStore` → `adapters/out/`; проверить, что `reqwest` остаётся только в HTTP-адаптере и Ollama по-прежнему ходит через `HttpClient`
- [x] 2.6 Сделать `lib.rs` composition root: `pub use` сервисов, ports, `HttpClient`, `create_provider`, `CoreError`, DTO; wiring factory не в `application`; обновить rustdoc (атом 2.4 выполнен); проверить `cargo check -p underlator-core` и что hosts по-прежнему видят `underlator_core::CRATE_NAME`

## 3. Тесты границ, правила, DoD (завершающий этап)

- [x] 3.1 Обновить path-сканы в бывших `http/tests.rs` / `provider/tests.rs` под новые пути слоёв; перенести тесты вместе с модулями, не меняя сценариев MVP; проверить, что `cargo test -p underlator-core` зелёный
- [x] 3.2 Зафиксировать negative-сценарий в rustdoc `tests/architecture.rs`: добавление `use crate::adapters::…` в `application` MUST валить тестовый прогон; убедиться, что `arch_lint::check!()` реально выполняется в `cargo test -p underlator-core` (в выводе есть architecture test)
- [x] 3.3 Пометить `underlator-server` и `underlator-tauri` rustdoc как driving adapters (без новых MVP routes/commands); проверить `rg` по hosts: нет `model`/`catalog`/`chat` routes/commands из этого атома, нет копии use-case логики
- [x] 3.4 Обновить `.cursor/rules/rust-hexagonal-architecture.mdc` (убрать исключение «до 2.4 прагматичная раскладка») и `openspec/config.yaml` `context` (после 2.4 новый код только в hex-слоях; DoD следующих Rust-change = arch-lint + `cargo test -p underlator-core`); проверить, что формулировки согласованы с деревом слоёв
- [x] 3.5 Выполнить `cargo test -p underlator-core`, `cargo check --workspace` и `cargo clippy -p underlator-core -- -D warnings` с кодом `0`; публичные items перенесённых модулей имеют rustdoc на русском (`cargo doc -p underlator-core --no-deps`)
- [x] 3.6 Убедиться, что нет Axum/Tauri MVP routes/commands, нет React `BackendClient`, нет RAG, нет выпила Electron, нет новой бизнес-логики MVP; `electron-app/` и `react-app/` не изменены этим атомом; `underlator-core` не зависит от `tauri`/`axum`; `hex-lint` не подключён как основной tool

## Definition of Done (DoD)

Change `hexagonal-core-layout-2-4` считается выполненным **только если** все пункты ниже истинны:

1. В `underlator-core` есть слои `domain/` / `ports/` / `application/` / `adapters/out/` (http, ollama, fs/memory, catalog library HTTP); `lib.rs` — composition root с `pub use`
2. Подключён архитектурный линтер границ (`arch-lint` + `arch-lint.toml` + `tests/architecture.rs`); preset не включает sync-io как обязательный fail для filesystem store
3. Правила слоёв проверяются в `cargo test`: `application` ↛ `adapters`; `ports` ↛ `adapters`; `domain` ↛ `adapters`/`reqwest`/`hyper`; `reqwest` только в HTTP-адаптере; запрещённый импорт валит тесты
4. Use-cases, Ollama, HTTP-клиент и chat store **не** меняют наблюдаемое поведение относительно атома 2.3; существующие unit/mock-тесты зелёные
5. `cargo test -p underlator-core`, `cargo check --workspace`, `cargo clippy -p underlator-core -- -D warnings` завершаются с кодом `0`; публичные items имеют rustdoc на русском
6. Host-crates остаются driving adapters без MVP routes/commands из этого атома
7. Cursor rule hex-слоёв и OpenSpec `context` описывают 2.4 как выполненную норму для атомов 3.x+
8. **Не** реализованы: Axum routes, Tauri commands, React `BackendClient`, RAG, выпил Electron, новая бизнес-логика MVP
9. `electron-app/` и `react-app/` не требуют правок этого атома
10. Все чекбоксы в этом `tasks.md` отмечены `[x]`

## Out of scope (явно не делать)

- Атомы 3.x / 4.x / 5.x (Axum MVP, BackendClient, Tauri commands)
- RAG, splash runtime, embeddings, выпил Electron
- `hex-lint` как основной gate; обязательный полный `rustqual`
- Preset `recommended`/`strict` arch-lint (unwrap/sync-io политика)
- Смена JSON-контракта DTO или ондиск-формата `{id}.chat.json`
- `spawn_blocking` / `tokio::fs` для chat store
