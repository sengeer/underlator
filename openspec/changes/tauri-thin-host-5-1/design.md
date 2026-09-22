# Design

## Context

См. `proposal.md` (Why) и delta-спеки `tauri-thin-host` / `react-backend-client` / `hexagonal-core` / `rust-workspace`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §5.1. Контракт клиента: атом 4.1 (`TauriTransport`, `TAURI_COMMANDS` / `TAURI_EVENTS`). Образец host wiring: атом 3.1 (`underlator-server` `AppState`).

Наблюдение (код, не план):

- `underlator-tauri` — каркас: `run()` с optional feature `desktop` → `tauri::Builder::default().run(...)` **без** commands/state; `tauri.conf.json` уже указывает `frontendDist: ../../react-app/dist`, `devUrl: http://localhost:5173`.
- Ядро реэкспортирует `ModelService`, `CatalogService`, `ChatService`, `create_provider`, `FilesystemChatStore`, `HttpCatalogLibrary`, `StorageRoot`, `host_error_class`, DTO и карту `tauri_command` / IPC events. `ModelService::generate` / `install` принимают sync `FnMut` progress; поля `id`/`url` **не** пересобирают провайдера.
- `react-app` уже имеет `TauriTransport` + `TauriBridge` (globals `__TAURI_INTERNALS__` / `__TAURI__`), `detectTransport` (tauri раньше electron), фабрику `createBackendClient`. Invoke сейчас передаёт **плоский** объект полей DTO вторым аргументом; progress — `listen` на `model:generate-progress` / `model:install-progress`. Комментарий в модуле: «Host 5.1 не трогаем».
- Server 3.1: SSE с теми же именами событий + финальный SSE `result`. Desktop Tauri: финал = return invoke (как Electron), progress = events — клиент 4.1 уже так спроектирован.

## Goals / Non-Goals

**Goals:**

- Один `AppState` на процесс в tauri-host: wiring как у server → thin commands/events
- Карта command/event ↔ core use-case ↔ существующий TS `TauriTransport` / DTO (ниже)
- Рабочая frontend wiring без поломки HTTP/Electron
- Desktop `StorageRoot`; hex-запрет обхода core; stubs mailto/dialogs; чеклист паритета с Electron

**Non-Goals:**

- Выпил Electron / `ElectronTransport` / `electron-app` (6.1)
- Правки `underlator-server` / docker (кроме явной дыры контракта DTO — только описать)
- Новая бизнес-логика / смена JSON-ключей DTO в core
- RAG, splash runtime, embedded Ollama installer
- SSE→WebSocket на server; multi-user IAM
- Широкий рефакторинг React/FSD вне Tauri transport

## Decisions

1. **Модули только в `underlator-tauri`, не в `adapters/in` core**  
   Hex 2.4: inbound в host-crate. Предлагаемое дерево:

   ```text
   crates/underlator-tauri/src/
     main.rs
     lib.rs              # run / feature desktop vs scaffold stub
     config.rs           # Ollama URL, optional data-dir override, provider id
     error.rs            # CoreError → HostErrorClass → Tauri error payload
     state.rs            # AppState / wiring (зеркало server state.rs)
     commands/
       mod.rs            # generate_handler! / регистрация
       model.rs
       catalog.rs
       chat.rs
     stubs.rs            # mailto / native dialogs — заготовки, не MVP-gate
   ```

   Регистрация: `tauri::generate_handler![model_generate, … chat_add_message]`.  
   *Альтернатива:* inbound в core — нарушение 2.4. Отклонено.

2. **Один провайдер на процесс, URL из конфига host**  
   Старт (при `Builder::setup` / до run): `ProviderFactoryConfig { provider: { id, url }, allow_cloud: false }` → `create_provider` → `Arc<dyn LlmProvider>` → `ModelService` + `CatalogService` (+ `HttpCatalogLibrary::new()`). Default URL: `http://127.0.0.1:11434` (локальный Ollama на машине пользователя, не `http://ollama:11434` docker DNS). Env override допустим (например `OLLAMA_BASE_URL` / `UNDERLATOR_OLLAMA_URL`) — зафиксировать одно имя в tasks, не плодить.  
   *Альтернатива:* `create_provider` на каждый invoke — ломает `stop`. Отклонено.

3. **`StorageRoot` = app data dir, не `/data`**  
   При setup: `app.path().app_data_dir()` (Tauri 2 path API) → `create_dir_all` → `StorageRoot::new` → `FilesystemChatStore`. Опциональный override env для тестов/dev. Не хардкодить server paths.  
   *Альтернатива:* cwd-относительный `./data` — плохо для установленных desktop-сборок. Отклонено как default.

4. **Progress: Tauri events + return invoke (не SSE, не отдельный job-id)**  

   ```text
   model_generate:
     spawn/async → ModelService::generate(req, |chunk| app.emit(GENERATE_PROGRESS_EVENT, chunk))
     → Ok(GenerateResult string) | Err(classified)
   model_install: аналогично INSTALL_PROGRESS_EVENT → Ok(UnarySuccess)
   model_stop: ModelService::stop на том же Arc
   ```

   Имена событий = константы ядра (`model:generate-progress` / `model:install-progress`). Клиент уже подписан до `generate()` (как Electron/HTTP multiplex).  
   *Альтернатива:* дублировать SSE `result` event — расходится с `TauriTransport` (ждёт return invoke). Отклонено.  
   *Альтернатива:* менять core на async Stream API — вне скоупа. Отклонено.

5. **Карта command / use-case / TS (источник истины)**  

   | Tauri command | Core | TS `TauriTransport` | Invoke args (после wiring) | Успех |
   | --- | --- | --- | --- | --- |
   | `model_generate` | `ModelService::generate` | `model.generate` | `{ request: GenerateRequest+id/url }` | `string` |
   | `model_stop` | `stop` | `model.stop` | `{}` / без тела | `null`/`()` → void |
   | `model_install` | `install` | `model.install` | `{ request: InstallRequest }` | `{ success: true }` |
   | `model_remove` | `remove` | `model.remove` | `{ request: RemoveRequest }` | `{ success: true }` |
   | `model_list` | `list` | `model.list` | `{}` | `ListModelsResponse` |
   | `catalog_get` | `CatalogService::get` | `catalog.get` | `{ request?: GetCatalogRequest }` | `ModelCatalog` |
   | `catalog_search` | `search` | `catalog.search` | `{ request: CatalogFilters }` | `ModelCatalog` |
   | `catalog_get_model_info` | `get_model_info` | `catalog.getModelInfo` | `{ request: GetModelInfoRequest }` | card \| `null` |
   | `chat_create` | `ChatService::create` | `chat.create` | `{ request: CreateChatRequest }` | `ChatData` |
   | `chat_get` | `get` | `chat.get` | `{ request: GetChatRequest }` | `ChatData` |
   | `chat_update` | `update` | `chat.update` | `{ request: UpdateChatRequest }` | `ChatData` |
   | `chat_delete` | `delete` | `chat.delete` | `{ request: DeleteChatRequest }` | `{ deletedChatId }` |
   | `chat_list` | `list` | `chat.list` | `{ request?: ListChatsRequest }` | list DTO |
   | `chat_add_message` | `add_message` | `chat.addMessage` | `{ request: AddMessageRequest }` | addMessage DTO |

   | Event | Core DTO | TS |
   | --- | --- | --- |
   | `model:generate-progress` | `GenerateProgress` | `onGenerateProgress` |
   | `model:install-progress` | `InstallProgress` | `onInstallProgress` |

   **Выравнивание args:** текущий skeleton передаёт плоский spread полей. Tauri 2 матчит аргументы по **имени параметра** Rust. Решение: host-команды принимают один параметр `request: …DTO` (или `payload`); TS `TauriTransport` оборачивает тела в `{ request: … }` (generate: слить `id`/`url` в DTO как сейчас, затем обернуть). Unit-тесты имени команд сохраняются; добавить тест обёртки args.  
   *Альтернатива:* оставить плоский invoke и `#[serde(flatten)]` на command — хрупко для вложенных DTO. Отклонено.  
   *Альтернатива:* править имена команд — ломает карту 1.2/4.1. Отклонено.

6. **Ошибки: `HostErrorClass` → сериализуемый Tauri error**  
   Как server: `host_error_class(&CoreError)` + message. Формат для клиента: JSON-строка или объект `{ class, message }`, который `TauriTransport` парсит в `BackendError` (не всё подряд в `unsupported`). Если runtime отсутствует — по-прежнему `unsupported`.  
   *Альтернатива:* только строка Display — теряется класс для UI. Отклонено.

7. **Frontend wiring без поломки других транспортов**  
   - Обновить `tauri-transport.ts`: обёртка `{ request }`, разбор classified errors, при необходимости улучшить default bridge (globals Tauri 2; опционально тонкая зависимость `@tauri-apps/api` **только** если globals недостаточны — предпочтение без обязательного пакета во всех сборках, как в 4.1).  
   - `detectTransport` / `createBackendClient` уже выбирают tauri — проверить тесты; явный `VITE_BACKEND_MODE=tauri` для desktop scripts.  
   - Не трогать `HttpTransport` / `ElectronTransport` happy-path.  
   - Не рефакторить FSD/widgets вне необходимости.  
   *Альтернатива:* заставить весь UI ходить только через `@tauri-apps/api` — тянет пакет в Electron/HTTP бандл. Отклонено как default.

8. **Feature `desktop` и CI**  
   Сохранить возможность `cargo check -p underlator-tauri` без GTK/WebKit (default features без полного wry). MVP commands/state компилируются под `desktop`; на машинах без native deps — scaffold stub + unit-тесты команд с mock state **где возможно** без WebView. DoD: `cargo check --workspace`; полный smoke UI — ручной чеклист или машина с desktop feature.  
   *Альтернатива:* всегда требовать WebView в CI — ломает текущий Linux CI без WebKit. Отклонено.

9. **Desktop-only stubs**  
   `stubs.rs`: команды-заглушки или TODO-hooks для mailto / open dialog — документированы, не входят в MVP DoD. Splash / embedded Ollama — комментарий + отсутствие runtime (explicit later).  
   *Альтернатива:* реализовать splash lifecycle сейчас — вне MVP dual-mode scope. Отклонено.

10. **Паритет с Electron**  
    Чеклист в `tasks.md` / DoD (не автоматический E2E обязателен): те же сценарии, что 4.2 для server, но desktop Tauri vs Electron. Расхождения DTO → чинить на границе host/TS, не «с нуля» в domain.  
    *Альтернатива:* удалить Electron в том же атоме — 6.1. Отклонено.

11. **Стоимость горячего пути generate**  
    На токен: serialize progress DTO + `emit` + доставка слушателям (обычно 1). Не буферизовать весь поток в host сверх конкатенации в `ModelService`.

## Risks / Trade-offs

- **Плоские vs обёрнутые invoke args** → Mitigation: явная миграция `TauriTransport` + тесты; host принимает `request`.
- **Feature `desktop` недоступна в CI** → Mitigation: workspace check без WebView; ручной smoke / чеклист на машине с GTK/WebKit.
- **Single-flight generate** (как server/Electron) → Mitigation: один активный поток на процесс; не строить очередь в host.
- **Mid-stream provider error** → Mitigation: завершать invoke `Err(classified)`; клиент уже fail-closed без успешной строки.
- **Ollama не запущен на desktop** → Mitigation: ошибки `provider`/`http` на list/generate; не тащить embedded installer.
- **Случайная правка server/docker** → Mitigation: out of scope; только если обнаружена дыра общего DTO — описать issue, не раздувать PR.

## Migration Plan

1. Wiring `AppState` + commands/events в `underlator-tauri` (feature `desktop`).
2. Выровнять `TauriTransport` args/errors; прогнать unit-тесты `shared/api`.
3. Сборка UI в `react-app/dist` / `tauri dev` против локального Ollama.
4. Пройти чеклист паритета Electron ↔ Tauri; Electron остаётся рабочим.
5. Rollback: desktop feature не трогает server/Electron пути; revert host + transport diff.

## Open Questions

- Точное имя env для Ollama URL на desktop (`OLLAMA_BASE_URL` vs `UNDERLATOR_OLLAMA_URL`) — выбрать одно при apply, совместимое с привычкой server/compose где уместно.
- Нужен ли `@tauri-apps/api` в `react-app` dependencies или достаточно globals — решить при smoke; предпочтение globals.
