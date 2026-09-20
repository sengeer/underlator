# Proposal

## Why

Use-cases `model` (атом 2.3) не должны знать вендорные пути Ollama: иначе каждый новый облачный адаптер перепишет generate/list. HTTP-клиент (2.1) и DTO (1.2) уже есть, а исполняемого провайдера в core нет — атом 2.2 закрывает этот разрыв до переноса бизнес-логики.

## What Changes

- Ввести в `underlator-core` trait LLM-провайдера: `generate_stream`, `stop`, `list_models`, `install_model`, `remove_model` (`install`/`remove` у облачных stub — unsupported)
- Реализовать первый адаптер `OllamaProvider` поверх unified `HttpClient` (порт логики Electron `OllamaApi` для этих операций, без embeddings/show/health)
- Заложить реестр / factory по `provider_id` из конфига (`ollama` runtime-обязателен; `openrouter`, `anthropic` — stubs без полной реализации)
- Сохранить совместимость DTO с `ElectronApiConfig` / provider settings (`id`, `url`); `embedded-ollama` резолвится в тот же Ollama-адаптер
- Зафиксировать продуктовую политику: локальный Ollama — default; облако — явный opt-in (UI-предупреждение — позже)
- **Не** реализовывать use-cases `model`/`catalog`/`chat` (атом 2.3), Axum/Tauri, RAG и правки React

## Capabilities

### New Capabilities

- `llm-provider`: абстракция LLM-провайдера в core, адаптер Ollama поверх unified HTTP client, реестр/factory по `provider_id`, stubs облачных провайдеров и политика default = локальный Ollama

### Modified Capabilities

- `unified-http-client`: требование «в core нет исполняемого `OllamaProvider`» заменяется на границу: вендорные вызовы идут через провайдер, исходящий HTTP по-прежнему только через клиент ядра; use-cases `model`/`catalog`/`chat` этим атомом не появляются

## Impact

- Код: `crates/underlator-core` (модуль провайдеров, ошибки unsupported/cancelled/unknown, тесты на mock HTTP)
- Зависимости: существующий `HttpClient` / `tokio` / `futures-util`; без `tauri`/`axum` в core. При необходимости тонкое расширение клиента для пустого тела DELETE, без прямого `reqwest` из провайдера
- DTO `ProviderConfig` / `GenerateRequest` (поля `id`, `url`) не ломаются; React/Electron не правятся
- `underlator-server` / `underlator-tauri` не получают routes/commands и не ходят к LLM в обход core
- Следующий атом: 2.3 (use-cases вызывают trait, а не Ollama напрямую)
