# react-backend-client Specification

## Purpose
Даёт `react-app` единый transport-agnostic клиент MVP `model` / `catalog` / `chat`, чтобы один UI работал через HTTP/SSE (docker/server) и Electron IPC, с заделом под Tauri, без прямой зависимости виджетов от транспорта.

## Requirements

### Requirement: BackendClient mirrors preload MVP surface
`react-app` SHALL предоставлять клиентский API `BackendClient` с тремя фасадами `model`, `catalog` и `chat`, совпадающими по операциям с Electron preload MVP: `model.generate` / `stop` / `install` / `remove` / `list` плюс подписки `onGenerateProgress` и `onInstallProgress`; `catalog.get` / `search` / `getModelInfo`; `chat.create` / `get` / `update` / `delete` / `list` / `addMessage`. Клиент MUST NOT включать операции `rag.*` и `splash.*`. Входные и выходные JSON-ключи MUST совпадать с DTO `underlator-core` и текущими TypeScript-типами preload (смешанный camelCase / snake_case без переименования). Успешные унарные ответы MUST быть телами контракта ядра, без обязательной обёртки Electron `IpcResponse` на границе `BackendClient`.

#### Scenario: Model catalog and chat operations are present
- **WHEN** разработчик инспектирует публичный контракт `BackendClient`
- **THEN** MUST быть все 14 операций карты MVP (`model:generate` … `chat:add-message`)
- **AND** MUST быть подписки на события `model:generate-progress` и `model:install-progress`
- **AND** MUST NOT быть методов `rag.*` или `splash.*`

#### Scenario: Generate payload keys stay compatible
- **WHEN** вызывается `model.generate`
- **THEN** тело MUST содержать обязательные `model` и `prompt`, опциональные поля генерации как у текущего Ollama-запроса (`system`, `temperature`, `max_tokens`, `num_predict`, `think`, `context`) и конфиг провайдера `id` / `url`
- **AND** унарный успех MUST быть сконкатенированной строкой текста, эквивалентной preload invoke `data`

### Requirement: HTTP transport uses REST and SSE from server 3.1
HTTP-транспорт SHALL выполнять унарные операции через `fetch` на маршруты `/api/model`, `/api/catalog` и `/api/chat` (метод и путь как в карте имён ядра). `model.generate` и `model.install` MUST потреблять Server-Sent Events (`text/event-stream`), а не WebSocket. Имена SSE-событий прогресса MUST быть `model:generate-progress` и `model:install-progress`; поле `data` MUST разбираться как JSON DTO ядра. Успешное завершение потока MUST приниматься по SSE-событию `result` (строка для generate, `{ "success": true }` для install). `model.stop` MUST оставаться унарным `POST /api/model/stop`. HTTP-ошибки с JSON `{ "class", "message" }` MUST становиться ошибкой клиента; обрыв SSE без события `result` MUST считаться неуспехом, а не тихим успехом.

#### Scenario: Generate streams named SSE events
- **WHEN** выбран HTTP-транспорт и вызывается валидный `model.generate`
- **THEN** клиент MUST открыть `POST /api/model/generate` с `Accept` потока событий
- **AND** MUST доставить подписчикам кадры `model:generate-progress` с ключами `model`, `response`, `created_at`, `done`
- **AND** Promise generate MUST разрешиться текстом из финального события `result`
- **AND** MUST NOT открывать WebSocket для прогресса

#### Scenario: Install streams progress then unary success
- **WHEN** выбран HTTP-транспорт и вызывается валидный `model.install`
- **THEN** кадры MUST приходить как SSE `model:install-progress` с полем `status`
- **AND** успешное завершение MUST соответствовать `{ "success": true }` в событии `result`

#### Scenario: Unary catalog and chat use REST JSON
- **WHEN** выбран HTTP-транспорт и вызываются `catalog.get`, `catalog.search`, `catalog.getModelInfo` или CRUD чата / `addMessage`
- **THEN** клиент MUST использовать пути и методы карты (`GET /api/catalog`, `POST /api/catalog/search`, `GET /api/catalog/models/:name`, `POST|GET /api/chat`, `GET|PATCH|DELETE /api/chat/:id`, `POST /api/chat/:id/messages`)
- **AND** успешный разбор MUST дать JSON с ключами ядра (`ollama` / `totalCount` / `lastUpdated` для каталога; `id` / `title` / `messages` для чата)
- **AND** `getModelInfo` при JSON `null` MUST вернуть отсутствие модели, а не ошибку «не найдено»

#### Scenario: HTTP error body is classified
- **WHEN** сервер отвечает 4xx/5xx с телом `{ "class": "not_found", "message": "..." }`
- **THEN** операция `BackendClient` MUST завершиться ошибкой, сохраняющей класс и сообщение
- **AND** MUST NOT маскировать это как успешный `IpcResponse`

#### Scenario: Stop cancels in-flight HTTP generate
- **WHEN** идёт активный generate по SSE и вызывается `model.stop`
- **THEN** клиент MUST выполнить `POST /api/model/stop`
- **AND** операция generate MUST завершиться без новых успешных токенов (ошибка класса `cancelled` или закрытие потока)

#### Scenario: SSE close without result is failure
- **WHEN** HTTP generate/install закрывает поток без события `result` и без успешного унарного тела
- **THEN** Promise операции MUST быть отклонён
- **AND** MUST NOT возвращать пустую строку как успешную генерацию

### Requirement: Electron transport keeps current desktop working
Пока продукт на Electron, SHALL существовать транспорт, делегирующий MVP-операции в `window.electron.model` / `catalog` / `chat`. Он MUST разворачивать обёртку `IpcResponse` (`success` / `data` / `error`) в те же DTO, что отдаёт HTTP-транспорт, чтобы вызывающий код `BackendClient` не зависел от host-envelope. Отсутствие `window.electron` MUST давать явную ошибку «API недоступен», а не обращения к HTTP «на всякий случай» внутри Electron-транспорта.

#### Scenario: Electron generate unwraps IpcResponse
- **WHEN** выбран Electron-транспорт и preload возвращает `{ success: true, data: "hello" }`
- **THEN** `model.generate` MUST разрешиться строкой `hello`
- **AND** подписчики `onGenerateProgress` MUST получать кадры события `model:generate-progress`

#### Scenario: Missing electron API fails closed
- **WHEN** выбран Electron-транспорт и `window.electron.model` отсутствует
- **THEN** вызов MUST завершиться ошибкой о недоступности API
- **AND** MUST NOT выполнять `fetch` к `/api/model/*` из этого транспорта

### Requirement: Tauri transport is a typed client skeleton
SHALL существовать типизированный Tauri-транспорт, чьи имена команд и событий MUST совпадать с картой ядра (`model_generate`, `model_stop`, … `chat_add_message`; события `model:generate-progress` / `model:install-progress`). Этот атом MUST NOT добавлять MVP commands или доменную логику в `underlator-tauri`. Если host ещё не реализует команду, вызов MUST завершаться явной ошибкой «не реализовано host'ом», а не молчаливым fallback на Electron/HTTP.

#### Scenario: Tauri command names follow the core map
- **WHEN** разработчик инспектирует Tauri-транспорт
- **THEN** каждая из 14 MVP-операций MUST отображаться на `tauri_command` из карты ядра
- **AND** progress MUST слушаться по IPC-именам событий ядра

#### Scenario: Unwired host does not fake success
- **WHEN** выбран Tauri-транспорт и runtime invoke недоступен или команда не зарегистрирована
- **THEN** операция MUST завершиться ошибкой
- **AND** `crates/underlator-tauri` MUST NOT получить новые MVP handlers из этого атома

### Requirement: Transport is selected by flag or runtime detect
Выбор транспорта SHALL учитывать явный build/runtime флаг `VITE_BACKEND_MODE` (`http` | `electron` | `tauri`). Если флаг не задан, клиент MUST определить среду: наличие Tauri global → Tauri-транспорт; наличие `window.electron` → Electron-транспорт; иначе HTTP-транспорт. Явный флаг MUST побеждать автоопределение. Вызывающий код фич MUST получать один и тот же `BackendClient` независимо от выбранного транспорта.

#### Scenario: Explicit http mode wins
- **WHEN** задано `VITE_BACKEND_MODE=http` даже при наличии `window.electron`
- **THEN** MVP-вызовы MUST идти через HTTP-транспорт
- **AND** MUST NOT вызывать `window.electron.model|catalog|chat` для этих операций

#### Scenario: Electron is detected without flag
- **WHEN** флаг режима пуст и `window.electron` доступен, а Tauri global нет
- **THEN** MUST быть выбран Electron-транспорт

#### Scenario: Default without hosts is HTTP
- **WHEN** флаг режима пуст и нет ни Tauri global, ни `window.electron`
- **THEN** MUST быть выбран HTTP-транспорт

### Requirement: Existing generate and chat call sites use BackendClient
`feature-provider`, хук `use-model` (включая `stop`) и chat API слой (`shared/apis/chat-ipc` и клиент catalog/model, которым пользуется settings) SHALL выполнять MVP-операции только через `BackendClient`. Они MUST NOT обращаться к `window.electron.model|catalog|chat` напрямую. Поверхности `rag.*` и `splash.*` MAY оставаться на Electron IPC. Совместимые обёртки результатов чата (`success` / `error` для Redux) MAY сохраняться над `BackendClient`, но MUST не обходить его.

#### Scenario: Feature provider generate goes through the client
- **WHEN** выполняется чат, инструкция, простой или контекстный перевод через `feature-provider`
- **THEN** `generate` и подписка на прогресс MUST идти через `BackendClient.model`
- **AND** исходники этих обработчиков MUST NOT содержать `window.electron.model`

#### Scenario: Use-model stop goes through the client
- **WHEN** пользователь останавливает активную генерацию через `use-model`
- **THEN** MUST вызываться `BackendClient.model.stop`
- **AND** MUST NOT вызываться `window.electron.model.stop` напрямую

#### Scenario: Chat CRUD goes through the client
- **WHEN** slice или виджет создаёт, читает, обновляет, удаляет чат или добавляет сообщение
- **THEN** сеть/IPC MUST выполняться через `BackendClient.chat` (напрямую или через тонкую обёртку chat API)
- **AND** обёртка MUST NOT вызывать `window.electron.chat` в обход клиента

### Requirement: Widgets do not import transports
Слой FSD widgets SHALL зависеть только от публичного `BackendClient` / shared API фасадов. Виджеты MUST NOT импортировать модули HTTP/Electron/Tauri транспортов. Клиент catalog/model, живущий сегодня в `widgets/settings/apis`, MUST перестать быть точкой доступа к `window.electron` и MUST ходить в shared-клиент.

#### Scenario: Settings catalog does not touch transport modules
- **WHEN** виджет settings загружает каталог, ставит или удаляет модель
- **THEN** виджет MUST вызывать shared API / `BackendClient`
- **AND** файл виджета MUST NOT импортировать transport-модуль HTTP, Electron или Tauri

#### Scenario: Chat widget does not import transports
- **WHEN** виджет chat выполняет CRUD через свой slice
- **THEN** импорты виджета MUST NOT указывать на transport-модули
- **AND** MUST оставаться допустимым импорт shared API / типов чата

### Requirement: Change stays inside the React client atom
Этот атом MUST ограничиться клиентским слоем в `react-app` (контракт, транспорты, wiring существующих MVP-вызовов, минимальный Vite/env, без которого HTTP-клиент нельзя собрать и прогнать unit-тесты). Он MUST NOT реализовывать ручную E2E-приёмку UX атома 4.2, MUST NOT добавлять Tauri host commands, MUST NOT выпиливать Electron, MUST NOT трогать RAG/splash runtime, MUST NOT менять JSON DTO или бизнес-логику `underlator-core` и MUST NOT править MVP routes `underlator-server`, кроме документирования дыр контракта.

#### Scenario: No host or DTO expansion
- **WHEN** атом 4.1 завершён
- **THEN** `underlator-server` MVP paths и SSE-имена MUST остаться как в атоме 3.1
- **AND** `underlator-tauri` MUST NOT объявлять MVP commands
- **AND** `electron-app/` остаётся на месте
- **AND** JSON-ключи DTO ядра MUST совпасть с атомами 1.2–3.1
