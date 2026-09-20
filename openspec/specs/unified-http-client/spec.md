# unified-http-client Specification

## Purpose
Задаёт в `underlator-core` единую точку исходящего HTTP I/O: конфиг endpoint/headers/auth как данные, timeout, retry, маппинг ошибок и stream-ready вызовы, чтобы будущие провайдеры и use-cases не ходили в сеть в обход клиента.

## Requirements

### Requirement: Unified outbound HTTP client in core
Ядро SHALL предоставлять единый исходящий HTTP-клиент как единственную точку сетевого I/O для провайдеров и адаптеров, которым нужна сеть. Клиент MUST поддерживать unary JSON и потоковые ответы. Клиент SHALL жить в исходящем адаптерном слое (`adapters/out`), а не в `domain`, `ports` или `application`.

#### Scenario: Unary JSON request succeeds
- **WHEN** вызывающий код выполняет unary JSON-запрос через клиент ядра к тестовому HTTP endpoint
- **THEN** клиент MUST отправить JSON-тело с заданным методом и путём относительно base URL
- **AND** при успешном статусе MUST вернуть десериализованный JSON-ответ без требования host-фреймворков

#### Scenario: Client is the only outbound HTTP I/O
- **WHEN** исходящий HTTP выполняется из `underlator-core`
- **THEN** он MUST идти через клиент ядра
- **AND** слои `domain`, `ports` и `application` MUST NOT импортировать `reqwest` или `hyper` напрямую

### Requirement: Endpoint headers and auth are configuration data
Клиент SHALL принимать конфигурацию как данные: base URL, дополнительные HTTP-заголовки, сведения об аутентификации, timeout, политику retry и опциональный proxy. Конфигурация MUST NOT быть зашита под конкретного LLM-провайдера (пути `/api/generate` Ollama, каталог моделей и т.п. не являются частью этого клиента).

#### Scenario: Custom base URL and headers
- **WHEN** конфигурация задаёт base URL и набор заголовков
- **THEN** запрос MUST использовать этот base URL для сборки целевого URI
- **AND** MUST включить заданные заголовки в исходящий запрос

#### Scenario: Auth is data not provider code
- **WHEN** конфигурация содержит bearer-токен или эквивалентные auth-данные
- **THEN** клиент MUST добавить соответствующий заголовок авторизации
- **AND** MUST NOT требовать тип провайдера (`ollama`, `openrouter`, `anthropic`) для выполнения HTTP-вызова

#### Scenario: Proxy-ready settings
- **WHEN** в конфигурации задан proxy URL
- **THEN** клиент MUST быть готов направить запросы через этот proxy
- **AND** если proxy не задан, запросы MUST идти напрямую

### Requirement: Timeouts are enforced
Клиент SHALL ограничивать ожидание HTTP-операции настраиваемым timeout. Истечение timeout MUST завершать операцию ошибкой типа timeout, а не бесконечным ожиданием.

#### Scenario: Unary request exceeds timeout
- **WHEN** unary-запрос не получает ответ в пределах сконфигурированного timeout
- **THEN** клиент MUST прервать ожидание
- **AND** MUST вернуть доменную ошибку timeout

### Requirement: Retry on transient failures
Клиент SHALL повторять unary-запросы при временных сбоях согласно конфигурации retry (лимит попыток и backoff). Повторять MUST только временные классы ошибок (сеть, timeout, HTTP 429, HTTP 503). После того как потоковый ответ отдал первый кадр, клиент MUST NOT автоматически ретраить тот же stream.

#### Scenario: Transient status is retried then succeeds
- **WHEN** unary-запрос сначала получает временный сбой (сеть, timeout, 429 или 503), а повторная попытка успешна
- **THEN** клиент MUST повторить запрос в пределах сконфигурированного лимита
- **AND** MUST вернуть успешный JSON-ответ

#### Scenario: Non-retryable client error is not retried
- **WHEN** unary-запрос получает не-retryable HTTP-ошибку клиента (например 400, 401, 404)
- **THEN** клиент MUST NOT выполнять повторные попытки
- **AND** MUST вернуть доменную ошибку с соответствующим статусом

#### Scenario: Stream is not retried after first frame
- **WHEN** потоковый запрос уже доставил хотя бы один кадр вызывающему коду, а затем соединение обрывается
- **THEN** клиент MUST NOT автоматически начинать тот же stream заново
- **AND** MUST вернуть доменную ошибку обрыва потока

### Requirement: HTTP errors map to domain errors
Клиент SHALL отображать сбои транспорта и HTTP-статусы в доменные ошибки ядра. Вызывающий код MUST получать классифицированную ошибку (timeout, сеть, статус, исчерпание retry) без необходимости разбирать типы HTTP-crate.

#### Scenario: HTTP 404 maps to domain error
- **WHEN** сервер отвечает статусом 404 на unary-запрос
- **THEN** клиент MUST вернуть доменную ошибку со статусом 404
- **AND** публичный результат MUST NOT требовать зависимости от `reqwest` или `hyper`

#### Scenario: Network failure maps to domain error
- **WHEN** соединение к endpoint невозможно установить
- **THEN** клиент MUST вернуть доменную ошибку сети или внутреннюю инфраструктурную ошибку HTTP-слоя
- **AND** MUST NOT паниковать и MUST NOT оставлять необработанный тип HTTP-crate в публичном API

### Requirement: Stream adapters for chunked SSE and newline-delimited
Клиент SHALL поддерживать потоковую доставку ответа в режимах: raw/chunked байты, newline-delimited кадры и SSE-события. Адаптер формата MUST отдавать кадры инкрементально и MUST NOT требовать полной буферизации тела как единственного способа чтения. Разбор вендорного JSON Ollama (поля `response`/`done` generate) MUST NOT входить в этот клиент.

#### Scenario: Newline-delimited frames
- **WHEN** сервер отвечает телом из нескольких JSON-строк, разделённых `\n`
- **THEN** клиент в newline-delimited режиме MUST отдать каждый непустой кадр по мере поступления
- **AND** MUST NOT ждать конца всего тела, чтобы отдать первый кадр

#### Scenario: SSE frames
- **WHEN** сервер отвечает `text/event-stream` с несколькими `data:` событиями
- **THEN** клиент в SSE-режиме MUST отдать полезную нагрузку каждого события отдельно

#### Scenario: Chunked raw bytes
- **WHEN** вызывающий код запрашивает raw/chunked режим
- **THEN** клиент MUST отдавать последовательные фрагменты тела без обязательного JSON-парсинга

### Requirement: Tracing omits sensitive bodies by default
Клиент SHALL трассировать исходящие запросы на уровне метода, цели (без секретов) и статуса/длительности. По умолчанию клиент MUST NOT писать в лог тела запросов/ответов (промпты) и значения Authorization / API keys.

#### Scenario: Default trace has metadata not prompt body
- **WHEN** выполняется JSON-запрос с телом, содержащим промпт, и заголовком Authorization
- **THEN** трассировка по умолчанию MUST включать метод и несекретную цель запроса
- **AND** MUST NOT содержать текст промпта и значение токена авторизации

### Requirement: HTTP client change stays inside core I/O
Исходящий HTTP ядра MUST идти только через унифицированный клиент. Провайдеры LLM MUST вызывать этот клиент и MUST NOT импортировать `reqwest` или `hyper`. API клиента MUST NOT содержать вендорные пути Ollama (`/api/generate`, `/api/tags`, `/api/pull`, `/api/delete`) как именованные методы. Слой HTTP-клиента MUST NOT содержать use-case логику `model` / `catalog` / `chat`. Входящие Axum routes, Tauri commands, RAG и изменения React MUST NOT появляться из HTTP-слоя. Исполняемый `OllamaProvider` (и другие адаптеры провайдера) MAY существовать, если исходящий HTTP идёт только через клиент ядра.

#### Scenario: No provider or use-case runtime
- **WHEN** проверяется граница HTTP-слоя при наличии адаптера провайдера и use-cases
- **THEN** исполняемый `OllamaProvider` MUST использовать только унифицированный HTTP-клиент ядра и MUST NOT импортировать `reqwest` или `hyper`
- **AND** клиент MUST жить в исходящем адаптерном слое
- **AND** `underlator-server` и `underlator-tauri` не получают исходящий HTTP к LLM в обход core и не получают MVP routes/commands из этого capability
- **AND** `electron-app/` и `react-app/` остаются без обязательных правок этого изменения

#### Scenario: Providers use the client without reqwest
- **WHEN** адаптер провайдера выполняет generate, list, install или remove
- **THEN** исходящий HTTP MUST идти через клиент ядра
- **AND** исходники провайдера MUST NOT импортировать `reqwest` или `hyper`

#### Scenario: HTTP client has no vendor named endpoints
- **WHEN** вызывающий код пользуется HTTP-клиентом напрямую
- **THEN** клиент MUST принимать произвольный метод и относительный путь
- **AND** MUST NOT требовать знание путей `/api/generate` или `/api/tags` как части своего публичного API

#### Scenario: Use-cases and hosts stay out of HTTP layer
- **WHEN** проверяется граница HTTP-слоя после раскладки 2.4
- **THEN** исходники HTTP-адаптера MUST NOT содержать исполняемые use-case функции generate / CRUD чата / выборки каталога
- **AND** слои `application` и `ports` MUST NOT импортировать `reqwest` или `hyper`
- **AND** `underlator-server` и `underlator-tauri` не получают исходящий HTTP к LLM в обход core и не получают MVP routes/commands из этого capability
- **AND** `electron-app/` и `react-app/` остаются без обязательных правок этого изменения
