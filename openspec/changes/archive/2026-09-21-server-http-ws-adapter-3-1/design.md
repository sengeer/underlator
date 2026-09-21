# Design

## Context

См. `proposal.md` (Why) и delta-спеки `server-http-adapter` / `hexagonal-core` / `rust-workspace`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §3.1.

Наблюдение (код, не план): `underlator-server` — каркас `GET /healthz`, bind `127.0.0.1:8080`, зависимость `axum` + `underlator-core`, без serde/routes MVP. `docker/Dockerfile` — `CMD echo` stub; compose уже набрасывает `UNDERLATOR_DATA_DIR`, `OLLAMA_BASE_URL=http://ollama:11434`, volume `/data`. Ядро после 2.4 реэкспортирует `ModelService`, `CatalogService`, `ChatService`, `create_provider`, `FilesystemChatStore`, `HttpCatalogLibrary`, `host_error_class`, DTO и карту имён (`http_path` / `http_method` для 14 операций). `ModelService` держит один `Arc<dyn LlmProvider>`: поля `id`/`url` в DTO generate **не** пересобирают провайдера (иначе `stop` попадает в другой объект). Progress — callback `FnMut` внутри `generate`/`install`, без знания SSE/WS. `LlmProvider` публичный: mock в тестах host допустим без новой логики в core.

## Goals / Non-Goals

**Goals:**

- Один `AppState` на процесс: wiring `create_provider` + три сервиса + `StorageRoot`; handlers только parse → call → serialize
- REST 1:1 с картой имён; SSE для generate/install; auth fail-closed на не-loopback; static SPA опционален
- Docker multi-stage (бинарь + `vite build`) и рабочий compose; тесты host без живой Ollama

**Non-Goals:**

- Смена сигнатур use-cases, JSON-ключей DTO, ондиск-формата `{id}.chat.json`
- WebSocket как транспорт progress (отклонено ниже)
- `BackendClient` в React, Tauri commands, RAG/splash, multi-user store
- Новые исходящие адаптеры в core «чтобы server было удобнее»

## Decisions

1. **Транспорт progress — SSE, не WebSocket**  
   Generate/install — однонаправленный поток server→client; `stop` уже унарный `POST /api/model/stop`. SSE с `POST` (как streaming LLM API) несёт тот же `Authorization`, что REST, и не требует feature `ws` у Axum. Имена событий = IPC (`model:generate-progress` / `model:install-progress`), `data` = JSON DTO ядра. Финал: SSE-событие `result` с унарным телом (`GenerateResult` строка / `UnarySuccess`). Валидация до потока → JSON 400, не SSE.  
   *Альтернатива:* единый `/api/ws` — двусторонность не нужна, auth на Upgrade хуже, атом 4.x всё равно делает `fetch`. Отклонено.  
   *Альтернатива:* отдельный GET subscribe после POST start — два racy шага и job-id в host. Отклонено.

2. **Одновременная выдача chunk: spawn + mpsc, без смены core**  
   `generate` ждёт конца потока, callback синхронный. Handler: `tokio::spawn` задачи с `ModelService::generate`, `FnMut` шлёт в `tokio::sync::mpsc::unbounded_channel`, `Sse` читает `ReceiverStream`. Не буферизовать все chunk до `Ok(result)`. Тот же паттерн для `install`. `stop` вызывает `ModelService::stop` на **том же** `Arc` из `AppState`.  
   *Альтернатива:* добавить в core `Stream` API вместо callback — новая поверхность ядра вне скоупа 3.1. Отклонено.

3. **Один провайдер на процесс, URL из конфига host**  
   Старт: `ProviderFactoryConfig { provider: { id, url }, allow_cloud: false }` → `create_provider` → `Arc<dyn LlmProvider>` → `ModelService` + `CatalogService` (+ `HttpCatalogLibrary::new()`). Per-request `config.url` в generate DTO **не** создаёт второй клиент (контракт ядра). Docker задаёт `OLLAMA_BASE_URL=http://ollama:11434`.  
   *Альтернатива:* `create_provider` на каждый запрос — ломает `stop`. Отклонено.

4. **Модули только в `underlator-server`, не в `adapters/in` core**  
   Hex 2.4: inbound в host-crate. Предлагаемое дерево:

   ```text
   crates/underlator-server/src/
     main.rs          # tracing, config, fail-closed bind, axum::serve
     lib.rs           # Router + rustdoc driving adapter
     config.rs        # env → ServerConfig
     auth.rs          # Bearer и/или Basic
     error.rs         # CoreError → HostErrorClass → статус + JSON
     state.rs         # AppState / wiring
     routes/{model,catalog,chat,health}.rs
   ```

   Тесты: `tower::ServiceExt::oneshot` + mock `LlmProvider` + `MemoryChatStore`. Скан исходников host: нет `reqwest`/`hyper` и нет исходящего `/api/generate`.  
   *Альтернатива:* inbound-модули в `underlator-core/adapters/in` — нарушение 2.4. Отклонено.

5. **Карта HTTP как в `domain/contract.rs` (без новых path)**  

   | IPC | HTTP |
   | --- | --- |
   | model:generate / stop / install / remove / list | POST generate, POST stop, POST install, POST remove, GET list |
   | catalog:get / search / get-model-info | GET `/api/catalog`, POST `/api/catalog/search`, GET `/api/catalog/models/:name` |
   | chat CRUD + add-message | POST/GET `/api/chat`, GET/PATCH/DELETE `/api/chat/:id`, POST `/api/chat/:id/messages` |

   Query: `forceRefresh`, окно сообщений, фильтры list, `confirmed` / `createBackup` на DELETE (тело DELETE не требуется). Тела POST/PATCH — JSON DTO как есть. `getModelInfo` → 200 + `null`, не 404. Нет envelope `IpcResponse`.  
   *Альтернатива:* RPC `POST /api/ipc/:name` — расходится с уже опубликованной картой 1.2. Отклонено.

6. **Ошибки: таблица `HostErrorClass` в host, не в core**  
   `invalid` 400, `not_found` 404, `cancelled` 409, `unsupported` 501, `provider`/`http` 502, `storage`/`internal` 500. JSON `{ "class": "<snake>", "message": "..." }`.  
   *Альтернатива:* 499 для cancel — нестандартно для Axum/клиентов. Отклонено.

7. **Auth-задел: shared secret, fail-closed на публичный bind**  
   Env: `UNDERLATOR_AUTH_TOKEN` (Bearer) и/или пара `UNDERLATOR_AUTH_USER` + `UNDERLATOR_AUTH_PASSWORD` (Basic). Несколько пользователей, cookie-сессии, per-user чаты — вне скоупа. Правило: если bind не loopback и ни один секрет не задан → `main` exit до `TcpListener::bind`. Middleware на `/api/*`; `/healthz` без auth. Loopback без секрета — dev. Compose публикует `8080:8080` и bind `0.0.0.0:8080` → в compose **обязан** быть token (документированный dev-default, не для прода).  
   *Альтернатива:* всегда требовать token даже на 127.0.0.1 — ломает локальный `cargo run` против каркаса. Отклонено.  
   *Альтернатива:* TLS/OIDC — не атом 3.1.

8. **Конфиг только env (имена уже частично в compose)**  

   | Переменная | Смысл | Default |
   | --- | --- | --- |
   | `UNDERLATOR_BIND` | `host:port` | `127.0.0.1:8080` |
   | `UNDERLATOR_DATA_DIR` | `StorageRoot` (чаты `{id}.chat.json`) | `./data` |
   | `OLLAMA_BASE_URL` | `ProviderConfig.url` | `http://127.0.0.1:11434` |
   | `UNDERLATOR_PROVIDER_ID` | `ProviderConfig.id` | `ollama` |
   | `UNDERLATOR_STATIC_DIR` | каталог `vite` dist | пусто = не отдавать SPA |
   | `UNDERLATOR_AUTH_*` | см. решение 7 | пусто |

   Чат-store: `FilesystemChatStore::new(StorageRoot::new(data_dir))`. Каталог создавать при старте, если нет.  
   *Альтернатива:* TOML-файл поверх env — лишний формат в MVP. Отклонено; env достаточно для Docker.

9. **Static: `tower-http` ServeDir + fallback `index.html`; Docker собирает `npm run build`**  
   Не `react:build` (он копирует в Electron). `homepage: "./"` уже относительный. Нет static dir → API жив, `/` может быть 404. UI не переводится на HTTP в этом атоме: образ содержит dist «на будущее» для 4.x.  
   *Альтернатива:* nginx sidecar — второй контейнер без нужды. Отклонено.

10. **Docker multi-stage из корня репо**  
    - `node` stage: `react-app`, `npm ci`, `npm run build` (при необходимости `lingui:compile` до vite, если без скоммиченных catalogs сборка падает).  
    - `rust` stage: `cargo build -p underlator-server --release`.  
    - runtime: `debian:bookworm-slim` + ca-certificates, бинарь, `dist` → `/app/static`, `UNDERLATOR_STATIC_DIR=/app/static`, `UNDERLATOR_BIND=0.0.0.0:8080`, volume `/data`. Compose: `depends_on: ollama`, named volume, token. DoD crate **не** требует `docker compose up` против сети CI; достаточно Dockerfile/compose содержимого + unit host. Ручной `compose up` — ожидаемый результат плана, проверяется при apply если Docker доступен.  
    *Альтернатива:* оставить echo-stub и «TODO в 4.x» — нарушает §3.1. Отклонено.

11. **Зависимости host, не core**  
    Server: `serde`/`serde_json`, `tower-http` (`fs`, `trace`), `tower` + `http-body-util` (dev/test), `tracing-subscriber`, `tokio-stream` при необходимости для `ReceiverStream`. **Не** добавлять `reqwest` в server. Core `Cargo.toml` без `axum`. Workspace `axum` 0.8 уже есть (JSON; SSE в коробке).  
    *Альтернатива:* проксировать Ollama из Axum — обход hex. Запрещено.

12. **Стоимость горячего пути**  
    На токен generate: один send в unbounded channel + SSE frame, без лишней копии всего ответа до финала (финальная строка уже собрана в use-case). REST unary — один serde roundtrip DTO.

## Risks / Trade-offs

- **`FnMut` + spawn: если callback блокирует runtime** → Mitigation: только `unbounded_channel().send` (без `blocking_send`/IO в callback).
- **Один процесс = одна активная generate** (как у текущего провайдера/Electron) → Mitigation: не строить очередь jobs; `stop` глобален для инстанса. Документировать single-flight.
- **`vite build` в Docker упадёт на husky/`prepare` или lingui** → Mitigation: `npm ci --ignore-scripts` + явный `lingui:compile` при необходимости; не вызывать `react:build`.
- **Публичный compose с dev-token** → Mitigation: комментарий в compose + fail-closed если token убрали, bind остался `0.0.0.0`.
- **Static SPA без BackendClient бесполезен в браузере** → Mitigation: осознанно; API проверяется `curl`/тестами; UI — атом 4.x.
- **Имена моделей с `/` в path ` /api/catalog/models/:name `** → Mitigation: в MVP имена Ollama без `/`; при необходимости 4.x уточнит encoding, карту 1.2 не менять в 3.1.

## Migration Plan

- Electron и `react-app` исходники не мигрируют. Rollback = revert коммита server/docker; каркас `/healthz` восстанавливается.
- Потребление HTTP из UI — атом 4.1 (`HttpTransport` + SSE). Desktop commands — 5.x.
- Данные чатов: тот же `{id}.chat.json` под `UNDERLATOR_DATA_DIR`; смена машины = volume.

## Open Questions

Нет.
