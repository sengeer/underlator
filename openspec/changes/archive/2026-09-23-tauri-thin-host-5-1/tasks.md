# Tasks

## 1. Host skeleton and wiring

- [x] 1.1 Добавить в `underlator-tauri` зависимости из design (serde/serde_json при нужде, tauri path/plugins для app data dir; **не** `reqwest` для LLM); сохранить feature `desktop` для WebView; проверить, что `underlator-core` без `tauri` и host `Cargo.toml` без прямого LLM-HTTP клиента
- [x] 1.2 Ввести модули `config.rs`, `state.rs`, `error.rs`, `commands/{mod,model,catalog,chat}.rs`, опционально `stubs.rs` с rustdoc на русском; `lib.rs` остаётся driving adapter; проверить `cargo check -p underlator-tauri` (без desktop) и `cargo check -p underlator-tauri --features desktop` на машине с native deps (если недоступно — зафиксировать в DoD ручной пункт)
- [x] 1.3 Реализовать конфиг host: provider id/url (default `ollama` / `http://127.0.0.1:11434`), override через одно env-имя (`OLLAMA_BASE_URL` предпочтительно, как у server), опциональный override data dir; проверить unit-тест defaults и что docker DNS `http://ollama:11434` **не** является default desktop
- [x] 1.4 Собрать `AppState` один раз при setup: `create_provider` → `Arc<dyn LlmProvider>` → `ModelService` + `CatalogService` (`HttpCatalogLibrary`) + `ChatService` (`FilesystemChatStore` + `StorageRoot` из app data dir); не вызывать factory на каждый invoke; проверить, что commands не содержат хардкод исходящего `/api/generate`

## 2. Error mapping and MVP commands

- [x] 2.1 Маппинг `CoreError` → `host_error_class` + message в сериализуемую ошибку Tauri (`{ class, message }` или согласованный эквивалент); проверить тест/фикстуру: not_found и invalid не выглядят как успех
- [x] 2.2 Зарегистрировать 14 commands по карте ядра (`model_generate` … `chat_add_message`); аргумент команды — именованный `request` (DTO); нет commands `rag`/`splash` как MVP; проверить сверку имён с `underlator_core::operations()` / `tauri_command` и с `TAURI_COMMANDS` в TS
- [x] 2.3 Смапить unary model: `model_list` / `model_remove` / `model_stop` на `ModelService`; проверить вызов list/remove/stop на mock-провайдере (или интеграционный smoke) и что `stop` бьёт в тот же `Arc`
- [x] 2.4 Смапить catalog: `catalog_get` / `catalog_search` / `catalog_get_model_info` на `CatalogService`; неизвестная модель → `null` (как ядро/server); проверить ключи ответа каталога
- [x] 2.5 Смапить chat CRUD + `chat_add_message` на `ChatService`; persist под desktop `StorageRoot`; проверить create→get и файл чата под app data dir (temp override допустим в тесте)

## 3. Progress events (generate / install)

- [x] 3.1 `model_generate`: async invoke; `emit` кадров `model:generate-progress`; return сконкатенированной строки; пустые `model`/`prompt` → classified error без emit успеха; проверить mock: ≥2 progress + финальная строка
- [x] 3.2 `model_install`: emit `model:install-progress` + return `{ success: true }`; проверить mock-кадры; WebSocket/SSE endpoint в tauri-host MUST NOT появляться
- [x] 3.3 При активном generate `model_stop` отменяет поток на том же провайдере; проверить: после stop нет новых успешных токенов (cancelled / err)

## 4. Frontend TauriTransport wiring

- [x] 4.1 Обновить `tauri-transport.ts`: передавать invoke args как `{ request: … }` (generate: слить `id`/`url` в DTO, затем обернуть); разбирать classified host errors в `BackendError`; проверить unit-тесты имён команд/событий и обёртки args
- [x] 4.2 Убедиться, что default bridge / listen доставляет payload progress; при нехватке globals — минимальная правка без обязательного `@tauri-apps/api` во всех сборках (если пакет всё же нужен — только opt-in/desktop); проверить тест: нет runtime → ошибка, `fetch` не вызывается
- [x] 4.3 Проверить `detectTransport` / `createBackendClient`: tauri globals → `TauriTransport`; `VITE_BACKEND_MODE=tauri|http|electron` побеждает; `HttpTransport` и `ElectronTransport` не сломаны (существующие unit-тесты зелёные)
- [x] 4.4 Не рефакторить FSD/widgets вне необходимости wiring; `rag-ipc` / splash Electron не трогать; проверить `git diff` ограничен `shared/api` (+ точечные скрипты/env для desktop)

## 5. Desktop stubs and config polish

- [x] 5.1 Добавить заготовки mailto / native dialogs (`stubs.rs` или эквивалент) с rustdoc «не блокер MVP»; splash / embedded Ollama — явный later без runtime; проверить, что MVP DoD не зависит от этих stubs
- [x] 5.2 Актуализировать `tauri.conf.json` / build scripts при нужде (`frontendDist`, `devUrl`) без правок docker/server; проверить, что server/docker diff пуст (кроме крайней документированной дыры контракта)

## 6. Parity checklist and DoD gates

- [x] 6.1 Заполнить и пройти чеклист паритета Electron ↔ Tauri (ниже в DoD / ручная приёмка): model generate/stop/install/remove/list + progress; catalog get/search/info; chat create/get/update/delete/list/addMessage; основные ошибки (invalid, not_found, provider down)
- [x] 6.2 Скан `crates/underlator-tauri/src`: нет `reqwest` для LLM, нет прямого `/api/generate` Ollama; нет новой бизнес-логики в core; нет выпила Electron; проверить `rg`/review
- [x] 6.3 Прогнать `cargo check --workspace`, `cargo test -p underlator-core` (включая `--test architecture`), тесты/clippy по затронутым crates (`underlator-tauri`, при правках core — core), `npm` unit-тесты `shared/api` в `react-app`; публичные items host — rustdoc на русском; код выхода `0` где применимо

## Definition of Done (DoD)

Change `tauri-thin-host-5-1` считается выполненным **только если** все пункты ниже истинны:

1. `underlator-tauri` — driving adapter: 14 MVP commands вызывают `ModelService` / `CatalogService` / `ChatService`, без копии доменных правил
2. Progress generate/install идёт через Tauri events `model:generate-progress` / `model:install-progress`; финал — return invoke; `model_stop` на том же экземпляре провайдера
3. `StorageRoot` указывает на desktop app data dir (или явный desktop override), не на захардкоженный `/data` server/docker
4. Host без прямого LLM HTTP/`reqwest`/Ollama в обход core; `underlator-core` без зависимости от `tauri`
5. `TauriTransport` выполняет рабочие invoke + listen с обёрткой `{ request }` и classified errors; detect/`VITE_BACKEND_MODE=tauri` выбирает Tauri; `HttpTransport` и `ElectronTransport` живы
6. Desktop-only stubs (mailto/dialogs) не блокируют MVP; splash / embedded Ollama runtime **не** реализованы
7. Чеклист сравнения с Electron на MVP-сценариях пройден или явно зафиксирован как ручная приёмка с результатами
8. `cargo check --workspace` = 0; `cargo test -p underlator-core` (включая architecture lint) = 0; тесты/clippy затронутых crates = 0; unit-тесты `react-app` shared/api по Tauri = 0
9. Smoke desktop MVP (`tauri dev` / desktop feature + локальный Ollama) **или** полный ручной чеклист приёмки выполнен и записан
10. **Не** сделаны: атом 6.1 (выпил Electron), правки server/docker (кроме крайней дыры — описана, не раздута), новая бизнес-логика/смена DTO в core, RAG, SSE→WebSocket, multi-user IAM, широкий FSD-рефакторинг
11. Все чекбоксы в этом `tasks.md` отмечены `[x]`

### Ручной чеклист приёмки (Electron ↔ Tauri)

Отметить при smoke (или N/A с причиной, если нет WebView/Ollama в среде):

- [x] Generate stream: токены видны в UI / слушателе progress; финальный текст совпадает по смыслу с Electron — **покрыто** `tests/host_mvp.rs` (mock ≥2 progress + concat); UI smoke **N/A** (нет GTK/WebKit/dbus на CI-машине; `cargo check --features desktop` не собирается)
- [x] Stop во время generate: поток останавливается, нет «тихого» полного успеха после stop — **покрыто** `stop_cancels_in_flight_generate`; UI smoke **N/A** (см. выше)
- [x] model list / install progress / remove — **покрыто** host_mvp; UI smoke **N/A**
- [x] catalog get / search / getModelInfo (`null` для неизвестной) — **покрыто** host_mvp; UI smoke **N/A**
- [x] chat create / list / get / update / delete / addMessage; данные переживают перезапуск app (app data dir) — create/get/addMessage + файл под data dir **покрыто**; full CRUD UI / restart **N/A** без WebView
- [x] Ошибка: пустой prompt / отсутствующий chat id / Ollama down — classified, не silent success — empty prompt + missing chat **покрыто** (`invalid` / `not_found`); Ollama down — класс `http`/`provider` через тот же `HostError` маппинг
- [x] Режим HTTP (server) и Electron по-прежнему стартуют на своих путях без регрессии из этого PR — `git diff` server/docker пуст; unit-тесты `HttpTransport` / `ElectronTransport` / `detectTransport` зелёные

## Out of scope (явно не делать)

- Атом 6.1: удаление `ElectronTransport` / `electron-app` / перевод всех docs на «только Tauri»
- Правки `underlator-server` / `docker/*` (кроме документирования дыры общего контракта)
- Новые use-cases / смена JSON DTO / ондиск-формата чатов в core
- RAG, splash runtime, embedded Ollama installer
- WebSocket на server; multi-user IAM / OIDC
- Рефакторинг React/FSD вне Tauri transport wiring
