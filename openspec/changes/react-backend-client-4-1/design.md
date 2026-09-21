# Design

## Context

См. `proposal.md` (Why) и delta-спеку `react-backend-client`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §4.1. Контракт host: атом 3.1 (`server-http-adapter`).

Наблюдение (код, не план):

- UI MVP ходит в `window.electron`: `feature-provider` / `use-model` (`shared/lib/hooks/use-model/apis/model-ipc.ts` + прямой `window.electron.model.stop`), `shared/apis/chat-ipc`, `widgets/settings/apis/model-and-catalog-ipc.ts`. `rag-ipc` и splash остаются Electron-only.
- Call sites ждут либо строку generate, либо `ChatOperationResult` / `ModelOperationResult` (`success` / `error` / `data`) — это envelope Electron, не DTO ядра.
- `underlator-server` уже Nest `/api` + REST 1:1 с `domain/contract.rs`; generate/install — SSE (`event: model:generate-progress|model:install-progress`, финал `event: result`); ошибки `{ "class", "message" }` без `IpcResponse`; `POST /api/model/stop` → JSON `null` (`Json(())`).
- Vite: `base: './'`, порт 8000, **нет** `VITE_BACKEND_*`, **нет** unit-раннера (тесты settings — UI-кнопки). FSD eslint: `@feature-sliced`, `import/no-internal-modules` выключен.
- `underlator-tauri` — каркас без MVP commands.

## Goals / Non-Goals

**Goals:**

- Один публичный `BackendClient` (DTO-native) + три транспорта; фичи не знают host
- Таблица TS ↔ HTTP/SSE 3.1 как источник истины для `HttpTransport`
- Electron happy-path без смены JSON DTO; FSD: widgets не импортируют `transports/`
- Unit-тесты клиента (выбор транспорта, unwrap IPC, разбор SSE/ошибок) без живой Ollama и без compose-приёмки 4.2

**Non-Goals:**

- Ручной E2E UX / `docker compose up` как DoD (атом 4.2)
- Tauri host commands, смена DTO/ядра, правки MVP routes server
- Перевод RAG/splash, выпил Electron, WebSocket

## Decisions

1. **Публичный слой — `shared/api`, транспорты приватны**  
   Канон FSD: `shared/api`. Существующий `shared/apis/` (множественное) остаётся фасадом совместимости, не вторым клиентом.

   ```text
   react-app/src/shared/api/
     index.ts                 # getBackendClient, типы, BackendError; НЕ реэкспорт transports
     backend-client.ts        # интерфейс MVP
     create-backend-client.ts
     detect-transport.ts
     errors.ts
     types.ts                 # зеркало DTO / preload keys
     sse.ts                   # разбор text/event-stream (POST fetch)
     transports/
       http-transport.ts
       electron-transport.ts
       tauri-transport.ts
   ```

   Публичный импорт для app/widgets/features: `shared/api`. Транспорты — internal.  
   *Альтернатива:* положить всё в `shared/apis/backend-client` — плодит третий стиль рядом с `chat-ipc`. Отклонено.  
   *Альтернатива:* виджеты вызывают transport factory — нарушает §4.1 FSD. Отклонено.

2. **`BackendClient` — DTO-native; envelope остаётся в тонких фасадах**  
   Методы совпадают с preload (`model.generate(request, config?)`, `onGenerateProgress`, chat CRUD, …). Успех = тело ядра (строка generate, `ListModelsResponse`, `ChatData`, …). Ошибка = throw `BackendError { class, message }` (`class` как у server: `invalid` / `not_found` / `cancelled` / …; Electron без класса → `internal`).  
   `shared/apis/chat-ipc` и settings-клиент catalog/model **не удаляются**: ловят `BackendError` и собирают нынешний `ChatOperationResult` / `ModelOperationResult`, чтобы Redux slices не переписывать. Прямых `window.electron.model|catalog|chat` в фасадах больше нет.  
   *Альтернатива:* сразу перевести slices на throw — больше churn, выше риск сломать Electron. Отклонено для 4.1.

3. **Прогресс — multiplex подписок, как у preload (не callback в `generate`)**  
   `feature-provider` сначала `onGenerateProgress`, потом `generate()`. HTTP SSE привязан к запросу: `HttpTransport` хранит `Set` слушателей и **во время** `generate`/`install` рассылает кадры, затем резолвит Promise по `result`. Electron/Tauri — подписка на глобальные события host.  
   *Альтернатива:* сломать API и передать `onChunk` в `generate` — правки всех feature-handler'ов. Отклонено.

4. **HTTP: `fetch` + свой SSE-парсер, не `EventSource`, не WebSocket**  
   `EventSource` только GET и без произвольных заголовков; server 3.1 принимает **POST** generate/install. Парсер читает `ReadableStream` инкрементально (буфер хвоста кадра, O(n) по байтам потока), разбирает `event:` / `data:` (data может быть многострочным). `Accept: text/event-stream`. WebSocket в клиенте не появляется.  
   `generate`/`install` держат `AbortController`; `stop()` делает `POST /api/model/stop` **и** abort чтения (как сейчас: abort + IPC stop). Abort без `stop` на server не отменяет провайдера.  
   До старта потока 4xx JSON — не SSE: разобрать `{ class, message }` и throw. Обрыв без `result` — throw (дырка host: mid-stream `Failed` дропается, см. Risks).  
   *Альтернатива:* `eventsource` polyfill / WS — расходится с 3.1. Отклонено.

5. **Карта TS ↔ HTTP/SSE (атом 3.1, без новых path)**  

   Унарный JSON: тела = DTO ядра. Query — camelCase (`forceRefresh`, `includeMessages`, `messageLimit`, `messageOffset`, фильтры `list`, `confirmed`, `createBackup`). Path-параметры (`:id`, `:name`) важнее одноимённых полей тела (server уже перезаписывает `chat_id`). `getModelInfo`: 200 + `null` → `null`, не ошибка. Имя модели в path: `encodeURIComponent` (дыры `/` в имени не чиним на server).

   | IPC / метод клиента | HTTP | Тело / query | Успех |
   | --- | --- | --- | --- |
   | `model.generate` | `POST /api/model/generate` | JSON `GenerateRequest` (поля generate **плюс** `id`/`url` в том же объекте) | SSE, см. ниже |
   | `model.stop` | `POST /api/model/stop` | пусто | 2xx; тело MAY быть `null` — не `UnarySuccess` |
   | `model.install` | `POST /api/model/install` | JSON `{ name, tag?, registry?, insecure? }` | SSE, см. ниже |
   | `model.remove` | `POST /api/model/remove` | JSON `{ name }` | `{ "success": true }` |
   | `model.list` | `GET /api/model/list` | — | `{ "models": [{ name, size, modified_at }] }` |
   | `catalog.get` | `GET /api/catalog` | query `forceRefresh` | `{ ollama, totalCount, lastUpdated }` |
   | `catalog.search` | `POST /api/catalog/search` | JSON фильтры | тот же снимок каталога |
   | `catalog.getModelInfo` | `GET /api/catalog/models/:name` | path = `modelName` | карточка или `null` |
   | `chat.create` | `POST /api/chat` | JSON create DTO | `ChatData` |
   | `chat.list` | `GET /api/chat` | query фильтров list | `{ chats, totalCount, pagination }` |
   | `chat.get` | `GET /api/chat/:id` | query окна сообщений | `ChatData` |
   | `chat.update` | `PATCH /api/chat/:id` | JSON patch (`chatId` в path) | `ChatData` |
   | `chat.delete` | `DELETE /api/chat/:id` | query `confirmed` / `createBackup` | `{ deletedChatId }` |
   | `chat.addMessage` | `POST /api/chat/:id/messages` | JSON сообщения | `{ message, updatedChat }` |

   **SSE generate** (`Content-Type: text/event-stream`):

   | `event` | `data` (JSON) | Действие клиента |
   | --- | --- | --- |
   | `model:generate-progress` | `GenerateProgress` (`model`, `response`, `created_at`, `done`, опциональные duration/token/context) | вызвать слушателей `onGenerateProgress` |
   | `result` | строка (конкатенация `response`) | resolve `generate` |
   | *(нет / обрыв)* | — | reject |

   **SSE install:**

   | `event` | `data` | Действие |
   | --- | --- | --- |
   | `model:install-progress` | `InstallProgress` (`status`, `name`, …) | слушатели `onInstallProgress` |
   | `result` | `{ "success": true }` | resolve `install` |

   **Ошибки HTTP:** статус по 3.1 (`invalid` 400, `not_found` 404, `cancelled` 409, `unsupported` 501, `provider`/`http` 502, `storage`/`internal` 500) + тело `{ "class", "message" }` → `BackendError`. Не оборачивать в `IpcResponse` на границе клиента.

   **Склейка generate Electron → HTTP:** preload `(request, config)`; ядро ждёт один JSON с `id`/`url`. `HttpTransport` копирует `config.id`/`config.url` (default `ollama` / `http://127.0.0.1:11434`) в тело. Per-request URL **не** пересобирает провайдер на server (контракт 3.1) — поля нужны для совместимости JSON.

   *Альтернатива:* RPC `POST /api/ipc/:name` — расходится с картой 1.2/3.1. Отклонено.  
   *Альтернатива:* править server, чтобы `stop` отдавал `{ success: true }` и mid-stream error шёл SSE — вне скоупа; клиент толерантен к `null` и к обрыву без `result`.

6. **Выбор транспорта**  
   Порядок: непустой `import.meta.env.VITE_BACKEND_MODE` ∈ `{ http, electron, tauri }` → он; иначе `window.__TAURI_INTERNALS__` / `window.__TAURI__` → tauri; иначе `window.electron` → electron; иначе `http`. Явный флаг побеждает detect (сценарий: UI на Electron, но гоняем HTTP против local server).  
   `getBackendClient()` — ленивый singleton.  
   Base URL: `VITE_BACKEND_URL` (пусто = same-origin `/api/...`, production static с server 3.1). Опционально `VITE_BACKEND_TOKEN` → `Authorization: Bearer` на `/api/*` (loopback 3.1 без секрета; compose с token — заголовок нужен). Vite **MAY** проксировать `/api` → `127.0.0.1:8080` только как сборочный helper; это не приёмка 4.2.  
   *Альтернатива:* только build flag без detect — сломает текущий Electron, пока не проставят env во все скрипты. Отклонено как единственный механизм.

7. **`ElectronTransport` — unwrap `IpcResponse`, без `fetch`**  
   Делегат в `window.electron.model|catalog|chat`. Если ответ — объект с `success === false` → `BackendError`. Если `success` и есть `data` → вернуть `data`. Строка generate (старый формат) — вернуть как есть. Подписки — как preload (`onGenerateProgress` / `onInstallProgress`). Нет `window.electron` → fail closed, без fallback на HTTP внутри этого класса.  
   *Альтернатива:* оставить envelope на `BackendClient` — HTTP пришлось бы искусственно оборачивать. Отклонено.

8. **`TauriTransport` — typed skeleton, host не трогаем**  
   Имена `invoke` = `tauri_command` из `domain/contract.rs` (`model_generate`, `model_stop`, `model_install`, `model_remove`, `model_list`, `catalog_get`, `catalog_search`, `catalog_get_model_info`, `chat_create`, `chat_get`, `chat_update`, `chat_delete`, `chat_list`, `chat_add_message`). Events = `model:generate-progress` / `model:install-progress`.  
   Мост: узкий порт `TauriBridge { invoke, listen }` с default, который ищет runtime Tauri 2 (`core.invoke` / `event.listen`) **без** обязательной зависимости `@tauri-apps/api` во всех сборках (Electron/HTTP не тащат Tauri). Нет runtime / команда не зарегистрирована → ошибка `unsupported` / «не реализовано host'ом», без fallback. `crates/underlator-tauri` в 4.1 не меняется.  
   *Альтернатива:* сразу добавить `@tauri-apps/api` и commands в host — атом 5.1. Отклонено.

9. **Wiring call sites (минимальный diff поведения)**  
   - `feature-provider`: вместо `electron` из `apis/model-ipc` → `getBackendClient().model`.  
   - `use-model.stop`: `getBackendClient().model.stop()`, не `window.electron.model.stop`.  
   - `chat-ipc`: методы → `client.chat.*`, catch → прежний result-объект.  
   - `model-and-catalog-ipc`: то же для catalog/model; прогресс install через `onInstallProgress`. Файл MAY остаться в widgets как тонкая обёртка **или** переехать в `shared/api` + re-export, но `window.electron` из widgets уходит.  
   - `rag-ipc`, splash, `openMail`, `updateTranslations` — не трогать.  
   Удалить/сузить `use-model/apis/model-ipc.ts` до re-export, чтобы не держать второй generate-клиент.

10. **Тесты и FSD-gate без 4.2**  
    Добавить **vitest** (уже Vite; в `package.json` нет Jest runner). Тесты рядом со слоем: detect режима, unwrap Electron `IpcResponse`, HTTP mapping (mock `fetch`), SSE кадры + `result`, ошибка `{ class, message }`, обрыв без `result`, `getModelInfo(null)`, виджетный импорт transports запрещён.  
    ESLint: `no-restricted-imports` (или boundaries) — `widgets/**` и `pages/**` не импортируют `**/shared/api/transports/**`. `npm run type:check` остаётся DoD.  
    *Альтернатива:* не вводить runner и тестировать только руками — не соответствует «тестируемый» и оставляет 4.1 без воспроизводимого DoD. Отклонено.

11. **Стоимость горячего пути generate**  
    На токен: parse одного SSE-кадра + вызов N слушателей (обычно 1) + накопление строки в feature-provider как сейчас. Не буферизовать весь поток как одну строку сверх уже существующей конкатенации. Не JSON.parse всего лога.

## Risks / Trade-offs

- **Host дропает mid-stream SSE error** (`Failed` после первого кадра → кадр не эмитится) → Mitigation: клиент reject при close без `result`; не менять server в 4.1. Зафиксировать для 4.2/патча host при необходимости.
- **`stop` → `null`** vs ожидаемый объект → Mitigation: любой 2xx = успех.
- **Два generate подряд / single-flight server** → Mitigation: как Electron: один активный поток на процесс; не строить очередь в клиенте.
- **CORS на vite:8000 → server:8080** → Mitigation: same-origin в prod; `VITE_BACKEND_URL` + опциональный proxy в dev; unit-тесты на mock `fetch` не зависят от CORS.
- **Имена моделей с `/` в path** → Mitigation: `encodeURIComponent`; карту 3.1 не менять.
- **Явный `VITE_BACKEND_MODE=http` в Electron-сборке** сломает desktop, если env проставят по ошибке → Mitigation: default пустой флаг = detect; в Electron scripts флаг не ставить.
- **Tauri skeleton вызовут в UI до 5.1** → Mitigation: detect Tauri только при реальном global; ошибка «не реализовано», не silent HTTP.

## Migration Plan

- Поведение Electron: тот же preload, другой слой вызова. Rollback = revert коммита `react-app`; `window.electron` в preload не удаляется.
- Docker/static: после 4.1 SPA **может** ходить в `/api` при `http`-режиме; полная UX-приёмка — атом 4.2.
- Tauri: клиент готов к именам команд; host — 5.1.
- Данные чатов не мигрируют (формат `{id}.chat.json` тот же).

## Open Questions

Нет. Дыры контракта 3.1 (обрыв SSE, `stop`=`null`) закрыты решениями на клиенте, без смены scope.
