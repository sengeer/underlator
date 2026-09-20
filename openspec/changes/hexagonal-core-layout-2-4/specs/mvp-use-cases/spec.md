# Spec Delta

## ADDED Requirements

### Requirement: Use-cases occupy the application layer
Исполняемые use-cases `model`, `catalog` и `chat` SHALL жить в слое `application`. Они MUST зависеть только от `ports` и `domain`. Исходники use-cases MUST NOT импортировать исходящие адаптеры (LLM runtime, HTTP-клиент, filesystem store) и MUST NOT импортировать `reqwest` или `hyper`. Ports `LlmProvider`, `CatalogLibrary`, `ChatStore` и `StorageRoot` MUST жить в слое `ports`.

#### Scenario: Application sources do not name adapters
- **WHEN** проверяются исходники use-cases после раскладки 2.4
- **THEN** они MUST NOT содержать импорт `adapters`
- **AND** MUST NOT содержать `reqwest`, `hyper` или вендорный URI `/api/generate`
- **AND** MUST NOT вызывать filesystem API напрямую из chat use-case

#### Scenario: Ports remain mockable without adapters
- **WHEN** use-cases сконструированы с mock-портами
- **THEN** generate / catalog.get / chat.create MUST работать без исходящего HTTP и без диска
- **AND** смена filesystem store или Ollama-адаптера MUST NOT требовать правки сигнатур use-cases

## MODIFIED Requirements

### Requirement: Change stays inside core use-cases
Use-cases и storage ports MUST оставаться в `underlator-core`. Ядро MUST NOT добавлять Axum routes, Tauri commands, React `BackendClient`, RAG или выпил Electron из этого capability. После атома 2.4 use-cases MUST занимать слой `application` в гексагональной раскладке (`domain/` / `ports/` / `application/` / `adapters/out`).

#### Scenario: No host routes or hex relocation
- **WHEN** атом 2.4 завершён
- **THEN** `underlator-server` и `underlator-tauri` не имеют MVP HTTP routes / Tauri commands из этого capability
- **AND** `electron-app/` и `react-app/` остаются без обязательных правок
- **AND** публичный crate ядра по-прежнему не зависит от `tauri` и `axum`
- **AND** use-cases MUST находиться в слое `application`, а не в плоских модулях у корня `src/`
