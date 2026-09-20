# Spec Delta

## MODIFIED Requirements

### Requirement: HTTP client change stays inside core I/O
Исходящий HTTP ядра MUST идти только через унифицированный клиент. Провайдеры LLM MUST вызывать этот клиент и MUST NOT импортировать `reqwest` или `hyper`. API клиента MUST NOT содержать вендорные пути Ollama (`/api/generate`, `/api/tags`, `/api/pull`, `/api/delete`) как именованные методы. Use-cases `model`/`catalog`/`chat`, входящие Axum routes, Tauri commands, RAG и изменения React MUST NOT появляться из HTTP-слоя.

#### Scenario: Providers use the client without reqwest
- **WHEN** адаптер провайдера выполняет generate, list, install или remove
- **THEN** исходящий HTTP MUST идти через клиент ядра
- **AND** исходники провайдера MUST NOT импортировать `reqwest` или `hyper`

#### Scenario: HTTP client has no vendor named endpoints
- **WHEN** вызывающий код пользуется HTTP-клиентом напрямую
- **THEN** клиент MUST принимать произвольный метод и относительный путь
- **AND** MUST NOT требовать знание путей `/api/generate` или `/api/tags` как части своего публичного API

#### Scenario: Use-cases and hosts stay out of HTTP layer
- **WHEN** проверяется граница HTTP-слоя после появления провайдера
- **THEN** в core нет исполняемых use-case функций generate/CRUD чата/выборки каталога
- **AND** `underlator-server` и `underlator-tauri` не получают исходящий HTTP к LLM в обход core и не получают MVP routes/commands из атома провайдера
- **AND** `electron-app/` и `react-app/` остаются без обязательных правок этого изменения
