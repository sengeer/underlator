# Spec Delta

## MODIFIED Requirements

### Requirement: Provider change stays inside core adapters
Ядро SHALL сохранять абстракцию LLM-провайдера как единственный путь вендорных операций generate / stop / list / install / remove. Use-cases `model` MUST вызывать эту абстракцию и MUST NOT собирать вендорные HTTP-пути. Абстракция провайдера MUST NOT тащить в себя CRUD чата. Этот capability MUST NOT добавлять Axum routes, Tauri commands, RAG или обязательные правки React.

#### Scenario: No use-case or host runtime
- **WHEN** исполняется generate, stop, list, install или remove в core
- **THEN** вызов MUST идти через абстракцию LLM-провайдера
- **AND** код use-case MUST NOT содержать URI `/api/generate`, `/api/tags`, `/api/pull` или `/api/delete`
- **AND** `underlator-server` и `underlator-tauri` не получают MVP routes/commands и не ходят к LLM в обход core
- **AND** `electron-app/` и `react-app/` остаются без обязательных правок этого атома
