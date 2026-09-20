# Tasks

## 1. Errors, host mapping, skeleton

- [x] 1.1 Добавить варианты `CoreError`: `Validation { message }`, `NotFound { entity, id }`, `DeleteNotConfirmed`, `Storage { message }` с rustdoc на русском; проверить `cargo doc -p underlator-core --no-deps` без ошибок missing docs
- [x] 1.2 Добавить `host_error.rs`: `HostErrorClass` и `host_error_class`; проверить тесты: `NotFound` → `NotFound`, `Validation` → `Invalid`, `ProviderCancelled` → `Cancelled`, `HttpStatus` → `Http`; исходник MUST NOT импортировать `axum`/`tauri`
- [x] 1.3 Добавить зависимости `uuid` (v4) и dev-dep `tempfile`; проверить, что `crates/underlator-core/Cargo.toml` их содержит и `cargo check -p underlator-core` проходит
- [x] 1.4 Создать файлы `model/use_cases.rs`, `catalog/use_cases.rs`, `catalog/library.rs`, `chat/use_cases.rs`, `chat/store.rs`, `chat/fs_store.rs`, подключить `mod` и реэкспорт; проверить, что файлы существуют и `cargo check -p underlator-core` проходит
- [x] 1.5 Обновить rustdoc `lib.rs` / `model` / `catalog` / `chat`: use-cases атома 2.3 есть, hex 2.4 не сделан; проверить `cargo doc -p underlator-core --no-deps`

## 2. ChatStore and filesystem

- [x] 2.1 Описать object-safe `ChatStore` (`save`, `load`, `delete`, `list`) и `StorageRoot`; проверить, что тип собирается как `Arc<dyn ChatStore>` (`cargo check -p underlator-core`)
- [x] 2.2 Реализовать in-memory mock `ChatStore` (`HashMap`); проверить тест: save/load/list/delete без диска, неизвестный id → `NotFound`
- [x] 2.3 Реализовать `FilesystemChatStore`: `{root}/chats/{id}.chat.json`, JSON как Electron `ChatFileStructure`, атомарная запись temp+rename; проверить тест на `tempfile`: roundtrip `id`/`title`/сообщений и наличие файла `{id}.chat.json`
- [x] 2.4 Реализовать backup при `delete(..., backup = true)` в `{root}/chats/backup/`; проверить тест: после delete чата нет в `list`, копия есть на диске

## 3. Chat use-cases

- [x] 3.1 Реализовать `ChatService::create` / `get` (ID `chat_…`, ISO-8601, `includeMessages` / limit/offset, пустой title → `Validation`); проверить mock-тесты create→get, `includeMessages = false` даёт пустые messages, пустой title не пишет в store
- [x] 3.2 Реализовать `update` / `addMessage` (ID `msg_…`, patch, unknown id → `NotFound`); проверить mock-тесты: title меняется и `updatedAt` растёт, сообщение появляется в конце get, unknown id не создаёт чат
- [x] 3.3 Реализовать `delete` (`confirmed` обязателен) и `list` (фильтры, sort, pagination, элементы без полной истории); проверить mock-тесты: без `confirmed` store не трогается и чат остаётся; с `confirmed` возвращается `deletedChatId`; list отдаёт `chats`/`totalCount`/`pagination`

## 4. Model use-cases

- [x] 4.1 Реализовать `ModelService` на `Arc<dyn LlmProvider>`: `generate` (callback + конкатенация `response`), пустые `model`/`prompt` → `Validation` без вызова провайдера; проверить mock-тест: два chunk → два callback и строка-конкатенация, пустой prompt даёт 0 вызовов провайдера
- [x] 4.2 Реализовать `stop` на том же экземпляре провайдера; проверить mock-тест: после stop новые успешные токены не приходят, ошибка мапится в `HostErrorClass::Cancelled`
- [x] 4.3 Реализовать `install` (progress callback + `UnarySuccess`), `remove`, `list`; проверить mock-тесты: кадры install до success, remove `{ success: true }`, list содержит `name`/`size`/`modified_at`; исходник use-case без `/api/generate`

## 5. Catalog use-cases

- [x] 5.1 Описать port `CatalogLibrary` и HTTP-адаптер через `HttpClient` (URL только в `catalog/library.rs`) плюс статический fallback (`qwen3`); проверить, что use-case не импортирует `reqwest` и не содержит library URL (`rg` по `use_cases.rs`)
- [x] 5.2 Реализовать `catalog.get`: merge локальных (`list_models`) и библиотеки, дедуп по `name` (локальные вытесняют), кэш TTL 1 ч, `forceRefresh`; ошибка library → static; ошибка list → пустые локальные; проверить mock-тесты: `llama` локальный + library `llama`/`qwen3` → две карточки; library error → static; повторный get без refresh не дергает library
- [x] 5.3 Реализовать `search` (search/size/tags/sort/limit/offset) и `getModelInfo` (точное имя, иначе contains, нет → `null`); проверить mock-тесты на фильтр по имени, `totalCount` после фильтра, null для неизвестной модели

## 6. Boundaries and verification (DoD)

- [x] 6.1 Расширить архитектурный тест: `model/use_cases.rs`, `catalog/use_cases.rs`, `chat/use_cases.rs` без `reqwest`/`hyper` и без `/api/generate`; use-cases chat не вызывают `std::fs`; проверить, что тест проходит
- [x] 6.2 Выполнить `cargo test -p underlator-core` и `cargo check --workspace` с кодом `0`; публичные items новых модулей имеют rustdoc на русском
- [x] 6.3 Убедиться, что нет Axum/Tauri MVP routes/commands из этого атома, нет RAG, нет папок hex 2.4 как обязательной раскладки, `electron-app/` и `react-app/` не изменены этим атомом, `underlator-core` не зависит от `tauri`/`axum`

## Definition of Done (DoD)

Change `mvp-use-cases-model-catalog-chat-2-3` считается выполненным **только если** все пункты ниже истинны:

1. В `underlator-core` есть исполняемые use-cases `model` (generate stream + конкатенация, stop, install progress, remove, list) через `LlmProvider`
2. Есть use-cases `catalog` (get / search / getModelInfo): локальный список через провайдер, библиотека через port + `HttpClient`, кэш, fallback, дедуп по `name`
3. Есть use-cases `chat` (create / get / update / delete / list / addMessage) через port `ChatStore`
4. Есть ports `ChatStore` / `StorageRoot` и filesystem store: `{id}.chat.json`, атомарная запись, backup на delete; use-cases работают с in-memory mock без диска
5. `CoreError` содержит validation / not found / delete-not-confirmed / storage; `host_error_class` мапит их в host-агностичные классы без `axum`/`tauri`
6. Unit-тесты покрывают ключевые сценарии mock provider / mock store / mock library; filesystem roundtrip — на temp dir; живая Ollama не нужна
7. `cargo test -p underlator-core` и `cargo check --workspace` завершаются с кодом `0`; публичные items имеют rustdoc на русском
8. **Не** реализованы: Axum routes, Tauri commands, React `BackendClient`, RAG, гексагональная раскладка 2.4, выпил Electron
9. `electron-app/` и `react-app/` не требуют правок этого атома
10. Все чекбоксы в этом `tasks.md` отмечены `[x]`

## Out of scope (явно не делать)

- Атом 2.4 (hex-папки `domain/`/`ports/`/`application/`/`adapters/out` + arch-lint)
- Атомы 3.x / 4.x / 5.x (Axum, BackendClient, Tauri commands)
- RAG, splash, embeddings, OS-проба RAM/VRAM, выпил Electron
- Полный Electron `FileSystemService` (locks всех типов файлов)
