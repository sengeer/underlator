# Proposal

## Why

Use-cases и будущие LLM-провайдеры не должны каждый раз собирать свой `reqwest`/`fetch` с самодельными timeout/retry. Сейчас в `underlator-core` есть только stub `HttpClient` без I/O, а живой HTTP живёт в Electron `OllamaApi`. Атом 2.1 нужен до провайдера (2.2) и use-cases (2.3), иначе Ollama снова окажется «зашит» в каждый вызов.

## What Changes

- Развить HTTP-слой в `crates/underlator-core`: единый клиент с timeout, retry, маппингом ошибок и поддержкой unary JSON + stream (chunked / SSE / NDJSON через адаптер формата)
- Сделать endpoint, headers, auth, timeout/retry и proxy-ready настройки **данными конфигурации**, а не кодом конкретного провайдера
- Запретить прямые вызовы `reqwest`/`hyper` из будущих domain use-cases в обход клиента (клиент — единственная точка исходящего HTTP I/O в core)
- Добавить трассировку запросов без логирования тел промптов и секретов по умолчанию
- **Не** реализовывать `OllamaProvider`, use-cases `model`/`catalog`/`chat`, Axum routes, Tauri commands, RAG и правки React

## Capabilities

### New Capabilities

- `unified-http-client`: унифицированный исходящий HTTP-клиент ядра (конфиг как данные, timeout/retry, error mapping, stream-ready, граница без прямого `reqwest` из use-cases)

### Modified Capabilities

- (нет — `rust-workspace` описывает каркас crates; `mvp-api-contract` описывает DTO preload. Поведение контракта и состава workspace не меняется)

## Impact

- Код: `crates/underlator-core` (эволюция `http` stub, расширение `CoreError` HTTP-вариантами, тесты на mock HTTP)
- Зависимости: существующий workspace `reqwest` (json/rustls/stream); при необходимости — `dev-dependency` для mock-сервера. Без `tauri`/`axum` в core
- `electron-app` и `react-app` не меняются; Electron HTTP остаётся рабочим до паритета MVP
- `underlator-server` / `underlator-tauri` не получают исходящий HTTP к LLM
- Следующие атомы: 2.2 (`OllamaProvider` поверх этого клиента), 2.3 (use-cases без прямого `reqwest`)
