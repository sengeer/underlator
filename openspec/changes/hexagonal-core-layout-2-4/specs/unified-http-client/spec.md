# Spec Delta

## MODIFIED Requirements

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
