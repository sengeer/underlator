# Tasks

## 1. Host skeleton and wiring

- [x] 1.1 Добавить в workspace/`underlator-server` зависимости из design (serde, serde_json, tower-http `fs`/`trace`, tracing-subscriber, tokio-stream при нужде; **не** `reqwest`); dev: tower, http-body-util; проверить, что `crates/underlator-core/Cargo.toml` по-прежнему без `axum`/`tauri` и server без `reqwest`
- [x] 1.2 Ввести модули `config.rs`, `state.rs`, `error.rs`, `auth.rs`, `routes/` с rustdoc на русском; `lib.rs` собирает `Router` как driving adapter; проверить `cargo check -p underlator-server` и что `/healthz` остаётся
- [x] 1.3 Реализовать `ServerConfig` из env (`UNDERLATOR_BIND`, `UNDERLATOR_DATA_DIR`, `OLLAMA_BASE_URL`, `UNDERLATOR_PROVIDER_ID`, `UNDERLATOR_STATIC_DIR`, `UNDERLATOR_AUTH_*`) с defaults loopback / `ollama` / `http://127.0.0.1:11434`; проверить unit-тест: пустое env → эти defaults, `OLLAMA_BASE_URL=http://ollama:11434` попадает в `ProviderConfig.url`
- [x] 1.4 Собрать `AppState` один раз: `create_provider` → `Arc<dyn LlmProvider>` → `ModelService` + `CatalogService` (`HttpCatalogLibrary`) + `ChatService` (`FilesystemChatStore` + `StorageRoot`); не вызывать factory на каждый запрос; проверить, что handlers не содержат хардкод `11434`/`/api/generate`

## 2. Auth and bind policy

- [x] 2.1 Fail-closed: не-loopback bind без token/basic → ошибка конфига до `TcpListener::bind`; loopback без секрета разрешён; проверить unit-тест на `0.0.0.0:8080` без секрета (err) и `127.0.0.1:8080` без секрета (ok)
- [x] 2.2 Middleware Bearer и/или Basic на `/api/*`; без заголовка при включённом секрете → 401 и без вызова use-case; `/healthz` без auth; проверить oneshot: list без `Authorization` = 401, с валидным Bearer = не 401, healthz = 200

## 3. Error mapping and unary REST

- [x] 3.1 Маппинг `host_error_class` → HTTP: invalid 400, not_found 404, cancelled 409, unsupported 501, provider/http 502, storage/internal 500; JSON `{ "class", "message" }` без `IpcResponse`; проверить тест 404 чата и 400 пустого generate (не SSE)
- [x] 3.2 Смапить catalog: `GET /api/catalog`, `POST /api/catalog/search`, `GET /api/catalog/models/:name` на `CatalogService`; `getModelInfo` неизвестной модели → 200 + `null`; проверить oneshot с mock library/provider: ключи `ollama`/`totalCount`/`lastUpdated`, null без 404
- [x] 3.3 Смапить chat: `POST|GET /api/chat`, `GET|PATCH|DELETE /api/chat/:id`, `POST /api/chat/:id/messages` на `ChatService`; DELETE query `confirmed`/`createBackup`; persist под `UNDERLATOR_DATA_DIR`; проверить oneshot create→get на `MemoryChatStore` и (temp dir) файл `{id}.chat.json` под корнем
- [x] 3.4 Смапить unary model: `GET /api/model/list`, `POST /api/model/remove`, `POST /api/model/stop` на `ModelService`; проверить oneshot list с mock (`name`/`size`/`modified_at`) и что 14 путей карты имён имеют маршрут (тест сверки с `underlator_core::operations()`)

## 4. SSE generate and install

- [x] 4.1 `POST /api/model/generate`: валидный запрос → `text/event-stream`; spawn + unbounded mpsc; события `model:generate-progress` + финал `result` с конкатенацией; пустые `model`/`prompt` → 400 JSON без потока и без вызова провайдера; проверить mock: два chunk → два SSE + финальный текст
- [x] 4.2 `POST /api/model/install`: SSE `model:install-progress` и финал `{ "success": true }`; проверить mock-кадры status и success в потоке; WebSocket endpoint MUST NOT появляться
- [x] 4.3 `POST /api/model/stop` на том же `Arc` сервиса, что generate; проверить mock: после stop новые успешные токены не приходят (cancel 409 или закрытие потока)

## 5. Static SPA

- [x] 5.1 Если `UNDERLATOR_STATIC_DIR` задан: `ServeDir` + fallback `index.html`; `/api/*` и `/healthz` не перехватываются static; без каталога API жив; проверить temp `index.html` на `GET /` и что без dir `/healthz` = 200
- [x] 5.2 Не менять `react-app/` (нет `BackendClient` / HttpTransport) и `electron-app/`; проверить `git diff --stat` по этим деревьям пуст относительно цели атома

## 6. Docker delivery

- [x] 6.1 Заменить `docker/Dockerfile`: multi-stage `npm ci --ignore-scripts` + `npm run build` (не `react:build`), `cargo build -p underlator-server --release`, runtime бинарь + dist в `/app/static`, `CMD` запускает `underlator-server` (не `echo`); проверить `rg` что stub `echo` исчез и есть `UNDERLATOR_STATIC_DIR`/`UNDERLATOR_BIND=0.0.0.0`
- [x] 6.2 Обновить `docker/docker-compose.yml`: server + ollama, volume данных, `OLLAMA_BASE_URL=http://ollama:11434`, `UNDERLATOR_BIND=0.0.0.0:8080`, `UNDERLATOR_AUTH_TOKEN` (dev-default + комментарий); проверить `docker compose -f docker/docker-compose.yml config` (если Docker CLI есть) и что нет `127.0.0.1:11434` у сервиса server

## 7. Boundaries and DoD gates

- [x] 7.1 Скан `crates/underlator-server/src`: нет `reqwest`/`hyper`, нет исходящего `/api/generate`; нет маршрутов `rag`/`splash`; `underlator-tauri` без MVP commands; проверить тестом/`rg`
- [x] 7.2 Прогнать `cargo test -p underlator-server`, `cargo test -p underlator-core` (включая `--test architecture`), `cargo check --workspace`, `cargo clippy -p underlator-server -- -D warnings` с кодом `0`; публичные items server имеют rustdoc на русском
- [x] 7.3 Убедиться, что нет новой бизнес-логики в core (нет смены JSON DTO / merge каталога / формата чатов), нет multi-user IAM, нет Tauri MVP, нет выпила Electron; все чекбоксы выше отмечены

## Definition of Done (DoD)

Change `server-http-ws-adapter-3-1` считается выполненным **только если** все пункты ниже истинны:

1. `underlator-server` — driving adapter: REST `/api/model/*`, `/api/catalog/*`, `/api/chat/*` вызывают `ModelService` / `CatalogService` / `ChatService`, без копии доменных правил
2. 14 операций карты имён ядра имеют HTTP-маршрут; `rag.*` / `splash.*` маршрутов нет
3. Generate и install отдают SSE (`model:generate-progress` / `model:install-progress`) + финальный `result`; WebSocket для progress нет; `stop` унарный на том же экземпляре провайдера
4. Ошибки мапятся через `HostErrorClass` в статусы из spec; валидация generate → 400 без потока
5. Конфиг env: bind, data dir, Ollama URL, provider defaults, static, auth; чаты пишутся под `StorageRoot`
6. Auth-задел: публичный bind без секрета не стартует; `/api/*` с секретом требуют Bearer/Basic; `/healthz` без LLM
7. Production static SPA отдаётся из `UNDERLATOR_STATIC_DIR` с fallback `index.html`; без каталога API жив
8. `docker/Dockerfile` больше не echo-stub; compose: server + Ollama + volume + sidecar URL + token
9. Исходники server без `reqwest`/`hyper` и без исходящего `/api/generate`; core без зависимости от `axum`
10. `cargo test -p underlator-core` (включая architecture lint), `cargo test -p underlator-server`, `cargo check --workspace` завершаются с кодом `0`; rustdoc публичных items server на русском
11. **Не** реализованы: React `BackendClient`, Tauri commands, RAG, splash runtime, выпил Electron, новая бизнес-логика MVP в core, multi-user модель
12. `electron-app/` и `react-app/` не требуют правок этого атома
13. Все чекбоксы в этом `tasks.md` отмечены `[x]`

## Out of scope (явно не делать)

- Атом 4.x (React `BackendClient` / HttpTransport / перевод `use-model`)
- Атом 5.x (Tauri commands/events)
- RAG, splash, embeddings, выпил Electron
- WebSocket endpoint для progress
- Смена JSON-контракта DTO или ондиск-формата `{id}.chat.json`
- Multi-user IAM / per-user chat store / OIDC / TLS terminator
- Новые use-cases или исходящие адаптеры в `underlator-core`
