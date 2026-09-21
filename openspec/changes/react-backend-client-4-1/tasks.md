# Tasks

## 1. Scaffold and test runner

- [x] 1.1 Создать дерево `react-app/src/shared/api/` (`index.ts`, `backend-client.ts`, `create-backend-client.ts`, `detect-transport.ts`, `errors.ts`, `types.ts`, `sse.ts`, `transports/{http,electron,tauri}-transport.ts`) и проверить, что публичный `index.ts` экспортирует `getBackendClient` / типы / `BackendError` и **не** реэкспортирует `transports/`
- [x] 1.2 Добавить vitest (devDependency + script `test` / `test:unit`) и проверить, что `npx vitest run` стартует и завершается (пока можно с пустым/smoke тестом)
- [x] 1.3 Объявить Vite env `VITE_BACKEND_MODE`, `VITE_BACKEND_URL`, опционально `VITE_BACKEND_TOKEN` (типы `ImportMetaEnv`, default флага пустой) и проверить `npm run type:check` без ошибок на новых полях

## 2. Contract and transport selection

- [x] 2.1 Описать интерфейс `BackendClient` (`model` / `catalog` / `chat` = 14 операций + `onGenerateProgress` / `onInstallProgress`) на JSON-ключах DTO ядра без `IpcResponse` и без `rag.*`/`splash.*`; проверить typecheck и unit-тест «набор методов совпадает с картой MVP»
- [x] 2.2 Реализовать `BackendError { class, message }` и маппинг HTTP-тела `{ class, message }` плюс fallback `internal` для Electron без класса; проверить тест: `{ class: "not_found" }` сохраняет класс
- [x] 2.3 Реализовать `detect-transport` (явный `VITE_BACKEND_MODE` побеждает; иначе `__TAURI__`/`__TAURI_INTERNALS__` → tauri; иначе `window.electron` → electron; иначе http) и проверить тесты: `http` при наличии `window.electron`; detect electron; default http
- [x] 2.4 Реализовать `getBackendClient()` как ленивый singleton над выбранным транспортом и проверить тест: повторный вызов возвращает тот же экземпляр

## 3. ElectronTransport

- [x] 3.1 Реализовать делегирование `window.electron.model|catalog|chat` с unwrap `IpcResponse` (`success`/`data`/`error`, строка generate как есть) и проверить тесты: `{ success: true, data: "hello" }` → `"hello"`; `success: false` → throw
- [x] 3.2 Подключить `onGenerateProgress` / `onInstallProgress` к preload-событиям и проверить тест: callback вызывается и unsubscribe снимает слушатель (mock preload)
- [x] 3.3 Fail closed при отсутствии `window.electron`; проверить тест: нет `fetch` на `/api/*` из этого транспорта

## 4. HttpTransport (REST + SSE)

- [x] 4.1 Реализовать унарный `fetch` по таблице design (включая merge `config.id`/`url` в тело generate, query camelCase, `encodeURIComponent` для `:name`, 2xx `stop` при теле `null`, `getModelInfo` JSON `null` → `null`) и проверить mock-`fetch` тесты на `GET /api/model/list`, `GET /api/catalog`, `POST /api/chat`, `GET /api/catalog/models/:name` → `null`
- [x] 4.2 Реализовать разбор SSE из `ReadableStream` (`event:` / `data:`, не `EventSource`, не WebSocket) и проверить тест: два кадра `model:generate-progress` + `result` со строкой → слушатели получили оба chunk, Promise = финальный текст
- [x] 4.3 Реализовать SSE `model.install` (`model:install-progress` + `result` `{ success: true }`) и проверить mock-тест кадров `status` и resolve `{ success: true }`
- [x] 4.4 Маппить HTTP 4xx/5xx JSON `{ class, message }` в `BackendError`; обрыв SSE без `result` — reject (не пустая успешная строка); проверить тесты: 404 `not_found`; close без `result` → throw
- [x] 4.5 Реализовать `model.stop` как `POST /api/model/stop` плюс abort активного SSE; проверить тест: во время generate вызывается `/api/model/stop` и чтение потока прерывается
- [x] 4.6 Опциональный `Authorization: Bearer` из `VITE_BACKEND_TOKEN` на `/api/*` и относительные URL при пустом `VITE_BACKEND_URL`; проверить тест: с токеном заголовок есть, без токена — нет

## 5. TauriTransport skeleton

- [x] 5.1 Закодировать 14 `tauri_command` и два event-имени как в `domain/contract.rs`; проверить unit-тест таблицы имён (`model_generate` … `chat_add_message`, `model:generate-progress` / `model:install-progress`)
- [x] 5.2 Реализовать порт `TauriBridge` без обязательной зависимости `@tauri-apps/api`; при отсутствии runtime/команды — явная ошибка, без fallback на Electron/HTTP; проверить тест: invoke отсутствует → throw, `fetch` не вызывается
- [x] 5.3 Убедиться, что `crates/underlator-tauri` не получил MVP commands; проверить `git diff -- crates/underlator-tauri` пустой (или только несвязанное)

## 6. Wire existing call sites

- [x] 6.1 Перевести `feature-provider` на `getBackendClient().model` (generate + progress) и проверить: в файле нет `window.electron.model` и нет импорта старого `apis/model-ipc` generate-клиента
- [x] 6.2 Перевести `use-model.stop` на `BackendClient.model.stop` и проверить отсутствие `window.electron.model.stop` в `use-model.ts`
- [x] 6.3 Перевести `shared/apis/chat-ipc` на `BackendClient.chat` с сохранением `ChatOperationResult` для slices и проверить: нет `window.electron.chat`; catch `BackendError` даёт `success: false`
- [x] 6.4 Перевести settings catalog/model-клиент на `BackendClient` (install progress через `onInstallProgress`) и проверить: `widgets/settings/apis/model-and-catalog-ipc.ts` (или его замена) не вызывает `window.electron.model|catalog`
- [x] 6.5 Оставить `rag-ipc` и splash на Electron; проверить, что их файлы по-прежнему могут использовать `window.electron.rag` / `splash` и не требуют BackendClient

## 7. FSD, lint, and atom boundary

- [x] 7.1 Запретить импорт `shared/api/transports/**` из `widgets/**` и `pages/**` (eslint `no-restricted-imports` или boundaries) и проверить, что `npm run lint` падает на намеренном импорте транспорта из виджета (или эквивалентный negative-сценарий в тесте/доке задачи) и зелёный на реальном дереве
- [x] 7.2 Выполнить `npm run type:check` и unit-тесты клиента (`npx vitest run`) с кодом 0
- [x] 7.3 Проверить границы атома: нет правок MVP routes `underlator-server`, нет смены JSON DTO `underlator-core`, нет выпила `electron-app`, нет WebSocket-клиента, нет обязательного docker compose E2E 4.2; `rg "window\\.electron\\.model" react-app/src/shared/lib/hooks/use-model react-app/src/shared/apis/chat-ipc` пустой

## Definition of Done (DoD)

Change `react-backend-client-4-1` считается выполненным **только если** все пункты ниже истинны:

1. В `react-app` есть публичный `BackendClient` (FSD `shared/api`) с MVP-фасадами `model` / `catalog` / `chat` (14 операций + progress generate/install), JSON-ключи как у DTO ядра / preload, без обязательного `IpcResponse` на границе клиента
2. Есть `HttpTransport`: унарный `fetch` по карте `/api/model|catalog|chat` и SSE для generate/install (`model:generate-progress` / `model:install-progress` + финал `result`); WebSocket для progress нет
3. Есть `ElectronTransport` к `window.electron` с unwrap envelope; desktop Electron happy-path не требует правок фич под HTTP
4. Есть типизированный `TauriTransport` (имена команд/событий карты ядра) без MVP commands в `underlator-tauri` и без silent fallback
5. Выбор транспорта: `VITE_BACKEND_MODE` побеждает detect (`__TAURI__` / `window.electron` / иначе HTTP)
6. `feature-provider`, `use-model` (включая `stop`) и chat/catalog-model API ходят только в `BackendClient`; widgets не импортируют transport-модули; RAG/splash не входят в клиент
7. Unit-тесты покрывают detect, unwrap IPC, REST mapping, SSE + `result`, ошибку `{ class, message }`, обрыв без `result`; живая Ollama и `docker compose` **не** обязательны
8. `npm run type:check` и unit-тесты клиента завершаются с кодом `0`; FSD-запрет импорта транспортов из widgets действует
9. **Не** сделаны: атом 4.2 как приёмка UX, атом 5.x host, RAG/splash runtime, выпил Electron, новая бизнес-логика / смена JSON DTO в `underlator-core`, правки MVP routes `underlator-server`
10. Все чекбоксы в этом `tasks.md` отмечены `[x]`

## Out of scope (явно не делать)

- Атом 4.2 (ручной E2E UX: список чатов / generate stream / catalog install против compose)
- Атом 5.x (Tauri commands, app data dir, сравнение с Electron на живом host)
- RAG / splash / `openMail` / i18n Electron IPC
- Выпил `electron-app` и `ElectronTransport`
- Новые use-cases / смена DTO в `underlator-core`
- Правки Axum MVP routes и SSE-имён, кроме документации дыр в design
