# Tasks

## 1. Module skeleton

- [x] 1.1 Добавить в `underlator-core` модули `contract`, `events`, `model` (`dto`), `catalog` (`dto`), `chat` (`dto`), `rag`, `splash` и реэкспортировать их из `lib.rs`; проверить, что файлы существуют и `cargo check -p underlator-core` проходит
- [x] 1.2 Написать rustdoc на русском у всех новых `pub` items и placeholder-модулей (`rag`/`splash` без DTO); проверить `cargo doc -p underlator-core --no-deps` без ошибок missing docs

## 2. Model / catalog / chat DTO

- [x] 2.1 Реализовать DTO `model` (generate request + provider config `id`/`url`, install/remove/list, unary `{ success }` и список моделей) с JSON-ключами как в TS; проверить roundtrip-тест на ключи `model`, `prompt`, `max_tokens`, `name`, `models`, `modified_at`
- [x] 2.2 Реализовать DTO `catalog` (`forceRefresh`, filters, `ModelCatalog`, карточка модели, nullable `getModelInfo`); проверить roundtrip-тест на ключи `forceRefresh`, `displayName`, `totalCount`, `modelName`, `parameterSize`
- [x] 2.3 Реализовать DTO `chat` (сущности, CRUD-запросы, ответы `ChatData` / `{ deletedChatId }` / `{ chats, totalCount, pagination }` / `{ message, updatedChat }`); проверить roundtrip-тест на ключи `chatId`, `createdAt`, `defaultModel`, `deletedChatId`

## 3. Events and naming map

- [x] 3.1 Добавить единую модель событий generate/install progress (`CoreEvent` + строковые имена `model:generate-progress` и `model:install-progress`) без IPC/WS/Tauri; проверить roundtrip payload на ключи `response`, `done`, `created_at`, `status`, `name`
- [x] 3.2 Зафиксировать naming map IPC → use-case → HTTP path → Tauri command по таблице в `design.md` (14 операций + 2 события, без `rag.*`/`splash.*`); проверить тест, что каждый IPC-имя из MVP резолвится ровно в один use-case id

## 4. Verification (DoD)

- [x] 4.1 Выполнить `cargo test -p underlator-core` и `cargo check --workspace` с кодом `0`
- [x] 4.2 Убедиться, что `underlator-core` не зависит от `tauri`/`axum`, в core нет use-case функций generate/CRUD/Ollama, нет routes/commands в host-crates, `electron-app/` и `react-app/` не изменены этим атомом

## Definition of Done (DoD)

Change `mvp-api-contract-dto-1-2` считается выполненным **только если** все пункты ниже истинны:

1. В `crates/underlator-core` есть serde-DTO для preload-поверхности `model`, `catalog`, `chat` (запросы и ответы) и progress-события `model:generate-progress` / `model:install-progress`
2. JSON-ключи DTO совпадают с текущими TypeScript-типами Electron (смешанный camelCase/snake_case); roundtrip-тесты это подтверждают
3. Naming map в core покрывает все 14 IPC-операций MVP и 2 progress-события: IPC → use-case → черновик HTTP path; `rag.*` и `splash.*` отсутствуют
4. `cargo test -p underlator-core` и `cargo check --workspace` завершаются с кодом `0`
5. `underlator-core` не зависит от `tauri` и `axum`; публичные items имеют rustdoc на русском
6. **Не** реализованы: бизнес-логика use-cases, HTTP-клиент (кроме уже существующего stub), Ollama/провайдеры, RAG DTO, server routes, Tauri commands, React `BackendClient`
7. `electron-app/` и `react-app/` не требуют правок этого атома
8. Все чекбоксы в этом `tasks.md` отмечены `[x]`

## Out of scope (явно не делать)

- Атомы 2.1–2.3 (unified HTTP client, provider, use-cases)
- Атомы 3.x / 4.x / 5.x (Axum, BackendClient, Tauri commands)
- RAG, splash, embeddings, выпил Electron
- Правки JSON-имён в React/Electron «для красоты»
