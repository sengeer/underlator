# Spec Delta

## Purpose

Даёт docker/web-host Underlator: тонкий HTTP inbound-адаптер над существующими use-cases MVP `model` / `catalog` / `chat`, со streaming progress, static SPA, конфигом, auth-заделом и compose (server + Ollama).

## ADDED Requirements

### Requirement: Server host is a thin inbound adapter
`underlator-server` SHALL быть driving/inbound adapter: разобрать HTTP-вход, вызвать application/ports API `underlator-core` и сериализовать ответ. Host MUST NOT дублировать доменные правила generate, merge каталога или CRUD чата. Host MUST NOT выполнять исходящий HTTP к LLM или library API в обход ядра. Публичный crate ядра MUST NOT зависеть от host-фреймворка HTTP-сервера.

#### Scenario: Handlers delegate to core use-cases
- **WHEN** клиент вызывает операцию MVP через HTTP
- **THEN** host MUST передать в ядро те же contract DTO (JSON-ключи без переименования)
- **AND** MUST вернуть JSON, совместимый с типами ядра (или поток progress-событий ядра)
- **AND** MUST NOT содержать копию бизнес-логики generate / дедупа каталога / persist чата

#### Scenario: Server does not bypass core for LLM
- **WHEN** проверяются исходники `underlator-server`
- **THEN** они MUST NOT импортировать исходящий HTTP-клиент LLM (`reqwest` / `hyper`) для вызовов Ollama
- **AND** MUST NOT содержать вендорный URI `/api/generate` как собственный исходящий вызов
- **AND** `underlator-core` MUST NOT получить зависимость от HTTP-серверного фреймворка host

### Requirement: REST maps all MVP operations
Host SHALL выставлять REST/JSON для всех 14 операций карты имён ядра. Пути MUST жить под `/api/model`, `/api/catalog` и `/api/chat` и MUST совпадать с `http_path` / `http_method` карты (`model:generate` → `POST /api/model/generate`, … `chat:add-message` → `POST /api/chat/:id/messages`). Операции `rag.*` и `splash.*` MUST NOT получать маршруты. Унарные ответы (кроме generate/install stream) MUST быть JSON тел контракта, без обязательной обёртки Electron `IpcResponse`.

#### Scenario: Catalog and chat unary JSON
- **WHEN** клиент вызывает `GET /api/catalog`, `POST /api/catalog/search`, `GET /api/catalog/models/:name`, либо CRUD чата (`POST|GET|PATCH|DELETE /api/chat`, `GET|PATCH|DELETE /api/chat/:id`, `POST /api/chat/:id/messages`)
- **THEN** успешный ответ MUST быть JSON с ключами контракта ядра (`ollama` / `totalCount` / `lastUpdated` для каталога; `id` / `title` / `messages` для чата)
- **AND** `catalog.getModelInfo` при отсутствии модели MUST вернуть JSON `null` и успех, а не HTTP 404
- **AND** `GET /api/model/list` MUST вернуть объект с массивом `models` (`name`, `size`, `modified_at`)

#### Scenario: Naming map coverage without RAG
- **WHEN** разработчик сверяет маршруты host с картой имён ядра
- **THEN** каждая из 14 IPC-операций MVP MUST иметь HTTP-маршрут
- **AND** MUST NOT быть маршрутов `rag.*` или `splash.*`

### Requirement: Domain errors map to HTTP status
Host SHALL выбирать HTTP-статус по `HostErrorClass` ядра, не разбирая строку `Display` как единственный критерий. Тело ошибки MUST быть JSON с классом и сообщением. Классы MUST отображаться так: `invalid` → 400, `not_found` → 404, `cancelled` → 409, `unsupported` → 501, `provider` / `http` / `storage` / `internal` → 5xx (502 для `provider`/`http`, 500 для `storage`/`internal`).

#### Scenario: Missing chat is HTTP 404
- **WHEN** `GET /api/chat/:id` запрашивает неизвестный идентификатор
- **THEN** ответ MUST иметь статус 404
- **AND** JSON MUST включать класс `not_found`

#### Scenario: Empty generate fields fail closed before stream
- **WHEN** `POST /api/model/generate` приходит с пустым `model` или пустым `prompt`
- **THEN** host MUST вернуть 400 с классом `invalid`
- **AND** MUST NOT открывать поток progress
- **AND** MUST NOT вызывать провайдера (ошибка валидации ядра)

### Requirement: Generate and install progress stream over SSE
Поверхности `model:generate` и `model:install` SHALL отдавать прогресс как Server-Sent Events (`text/event-stream`), а не как WebSocket. Имена SSE-событий MUST совпадать с IPC-именами ядра: `model:generate-progress` и `model:install-progress`. Поле `data` MUST быть JSON payload DTO ядра (`GenerateProgress` / `InstallProgress`). После успешного generate поток MUST завершиться событием с унарным текстом (конкатенация `response`); после успешного install — событием с `{ "success": true }`. `POST /api/model/stop` SHALL оставаться унарным JSON и MUST отменять активную генерацию на том же экземпляре провайдера.

#### Scenario: Generate streams named progress events
- **WHEN** клиент отправляет валидный `POST /api/model/generate` и ядро отдаёт два chunk прогресса
- **THEN** ответ MUST иметь `Content-Type` `text/event-stream`
- **AND** клиент MUST получить два SSE-события `model:generate-progress` с JSON, содержащим `model`, `response`, `created_at`, `done`
- **AND** после chunk поток MUST содержать финальное событие с конкатенированным текстом

#### Scenario: Install streams progress then success
- **WHEN** клиент отправляет валидный `POST /api/model/install`
- **THEN** кадры прогресса MUST приходить как SSE-события `model:install-progress` с полем `status`
- **AND** успешное завершение MUST сопровождаться `{ "success": true }` в потоке

#### Scenario: Stop cancels in-flight generate
- **WHEN** идёт активный generate-поток и клиент вызывает `POST /api/model/stop`
- **THEN** последующие chunk MUST не доставляться как успешные токены
- **AND** операция generate MUST завершиться отменой (класс `cancelled` / HTTP 409) либо закрытием потока без новых токенов

### Requirement: Production static SPA is served
В production-режиме host SHALL отдавать собранный static `react-app` (каталог задаётся конфигом). Неизвестный путь, не являющийся `/api/*` и не существующим файлом, MUST возвращать `index.html` (SPA fallback). Отсутствие каталога static MUST NOT ломать `/api/*` и `/healthz`. Этот атом MUST NOT переводить UI на `BackendClient`.

#### Scenario: Index is served when static dir is configured
- **WHEN** конфиг указывает существующий каталог сборки и клиент запрашивает `/`
- **THEN** host MUST отдать `index.html` из этого каталога

#### Scenario: API works without static assets
- **WHEN** каталог static не задан или пуст
- **THEN** `GET /healthz` и маршруты `/api/*` MUST продолжать отвечать
- **AND** UI-код `react-app` MUST NOT требовать правок этого атома для работы API

### Requirement: Host config covers bind data dir and provider
Процесс server SHALL читать конфиг (переменные окружения и/или эквивалентный файл): адрес bind, каталог данных (`StorageRoot` чатов), base URL Ollama, значения provider по умолчанию (`id` / `url`), каталог static, параметры auth. Значения по умолчанию MUST быть безопасными для локальной разработки: bind loopback (`127.0.0.1:8080`), provider `ollama` и URL `http://127.0.0.1:11434`, если не переопределены. Чат-файлы MUST сохраняться под корнем данных.

#### Scenario: Data dir is the chat storage root
- **WHEN** server запущен с каталогом данных и вызывается `POST /api/chat` (create)
- **THEN** последующий `GET` того же чата MUST вернуть созданную сущность
- **AND** persist MUST оказаться под заданным корнем данных, а не в произвольном пути процесса

#### Scenario: Ollama base URL comes from config
- **WHEN** задан base URL провайдера, отличный от loopback-умолчания (например sidecar `http://ollama:11434`)
- **THEN** исходящие вызовы LLM MUST идти в ядро с этим URL
- **AND** host MUST NOT хардкодить адрес Ollama в handlers

### Requirement: Auth stub is required before public bind
До bind на не-loopback адрес (в том числе `0.0.0.0`) процесс SHALL требовать настроенный shared secret: Bearer token и/или HTTP Basic (один пользователь/пароль). Это MUST быть заготовка одного секрета, а не multi-user IAM. Если bind публичный и секрет не задан, процесс MUST завершиться ошибкой конфигурации и MUST NOT слушать порт. При настроенном секрете запросы к `/api/*` без валидных учёток MUST получать 401. `GET /healthz` MAY оставаться без auth для пробы живости. Loopback-bind MAY работать без секрета в разработке.

#### Scenario: Public bind without secret refuses to start
- **WHEN** bind задан как `0.0.0.0:8080` (или иной не-loopback) и token/basic не заданы
- **THEN** процесс MUST завершиться с ошибкой конфигурации
- **AND** MUST NOT принять TCP-соединения на этом адресе

#### Scenario: API rejects missing credentials when auth is on
- **WHEN** секрет настроен и клиент вызывает `/api/model/list` без `Authorization`
- **THEN** ответ MUST быть 401
- **AND** use-case list MUST NOT выполняться

#### Scenario: Loopback may run without auth
- **WHEN** bind — loopback и секрет не задан
- **THEN** процесс MAY стартовать
- **AND** `/api/*` MAY отвечать без заголовка `Authorization`

### Requirement: Docker compose delivers server and Ollama
Репозиторий SHALL содержать `docker/Dockerfile` и `docker-compose`, которые поднимают web-host и sidecar Ollama. Compose MUST прокидывать volume данных приложения (чаты/метаданные) в `StorageRoot` контейнера server и MUST задавать Ollama base URL на sidecar. Образ server MUST включать бинарь host и production-сборку `react-app`. Живая проверка всех LLM-операций против внешней сети MUST NOT быть обязательной для unit/integration тестов crate (они идут с mock/in-memory на стороне host или ядра).

#### Scenario: Compose file wires volume and Ollama URL
- **WHEN** разработчик читает `docker/docker-compose.yml`
- **THEN** сервис server MUST зависеть от сервиса ollama
- **AND** MUST монтировать named volume в каталог данных
- **AND** MUST передавать base URL Ollama на sidecar, а не на `127.0.0.1` внутри контейнера server

#### Scenario: Dockerfile is no longer an echo stub
- **WHEN** собирается образ по `docker/Dockerfile`
- **THEN** runtime-команда MUST запускать бинарь `underlator-server`, а не заглушку `echo`
- **AND** образ MUST содержать static-сборку frontend либо явно описанный каталог, который host может отдать

### Requirement: Health endpoint stays available
Host SHALL сохранять `GET /healthz` как пробу живости без вызова LLM.

#### Scenario: Healthz does not need a model
- **WHEN** клиент вызывает `GET /healthz`
- **THEN** ответ MUST быть успешным при живом процессе
- **AND** MUST NOT требовать доступности Ollama

### Requirement: Change stays inside the server host atom
Этот атом MUST ограничиться inbound HTTP-адаптером, конфигом, auth-заделом, static serve и docker. Он MUST NOT добавлять React `BackendClient`, Tauri commands, RAG, splash runtime, выпил Electron, новую бизнес-логику в `underlator-core` и MUST NOT вводить multi-user модель (роли, сессии многих пользователей, per-user store).

#### Scenario: No UI Tauri RAG or new core rules
- **WHEN** атом 3.1 завершён
- **THEN** `react-app/` не содержит обязательного `BackendClient` / HttpTransport из этого атома
- **AND** `underlator-tauri` не объявляет MVP commands
- **AND** `electron-app/` остаётся на месте
- **AND** наблюдаемое поведение use-cases ядра (валидация, merge каталога, формат `{id}.chat.json`) MUST совпасть с атомами 2.3–2.4
