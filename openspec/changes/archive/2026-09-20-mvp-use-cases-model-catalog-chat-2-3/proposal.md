# Proposal

## Why

DTO (атом 1.2), HTTP-клиент (2.1) и `LlmProvider` (2.2) уже есть, но исполняемой бизнес-логики `model` / `catalog` / `chat` в `underlator-core` нет: она живёт в Electron handlers. Без use-cases в ядре hosts Tauri/Axum снова продублируют IPC-логику, а MVP-контракт нельзя выполнить без Electron.

## What Changes

- Реализовать use-cases `model`: generate (stream + конкатенация текста), stop, install (stream progress), remove, list — только через `LlmProvider`, без вендорных путей
- Реализовать use-cases `catalog`: get / search / getModelInfo (порт логики `ModelCatalogService` + library API): локальный список через провайдер, библиотека через port + `HttpClient`, кэш, фильтры, fallback
- Реализовать use-cases `chat`: create / get / update / delete / list / addMessage через port `ChatStore`
- Ввести ports `ChatStore` и `StorageRoot`; filesystem-backed store, совместимый по смыслу с `ChatFileSystemService` (`{id}.chat.json`)
- Расширить `CoreError` (`thiserror`) вариантами not found / validation / storage и таблицей маппинга в host-классы ошибок (без типов Axum/Tauri)
- Покрыть ключевые use-cases unit-тестами с mock `LlmProvider` / mock `ChatStore` / mock catalog library (без живой Ollama и без сети)
- **Не** делать: Axum/Tauri routes, React `BackendClient`, RAG, гексагональную раскладку 2.4, выпил Electron

## Capabilities

### New Capabilities

- `mvp-use-cases`: исполняемые use-cases MVP `model` / `catalog` / `chat` в `underlator-core`, ports `ChatStore` / `StorageRoot` и filesystem store, доменные ошибки и тесты на mock-портах

### Modified Capabilities

- `llm-provider`: снимается запрет «нет исполняемых use-cases»; операции `model` MUST идти через `LlmProvider`, а не через вендорные HTTP-пути
- `mvp-api-contract`: DTO остаются payload'ами; требование «только типы, без runtime» заменяется на наличие исполняемых use-cases поверх тех же DTO

## Impact

- Код: `crates/underlator-core` (модули `model` / `catalog` / `chat` + storage ports/adapter, ошибки, тесты). Прагматичная раскладка до 2.4: use-cases рядом с DTO, ports как traits, filesystem — driven adapter
- Зависимости: существующие `async-trait` / `tokio` / `thiserror`; при необходимости `tokio` feature `fs` и тонкая dep для UUID. Без `tauri` / `axum` в core
- `underlator-server` / `underlator-tauri` не получают routes/commands; исходящий HTTP к LLM по-прежнему только через provider
- `electron-app/` и `react-app/` не правятся этим атомом
- Следующий атом: 2.4 (hex-раскладка + линтеры границ); hosts 3.x вызывают эти use-cases
