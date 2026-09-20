# Tasks

## 1. Module skeleton, errors, HTTP empty body

- [x] 1.1 Создать модуль `crates/underlator-core/src/provider/` (`mod.rs`, `port.rs`, `factory.rs`, `config.rs`, `ollama.rs`, `stub.rs`) и реэкспортировать `provider` из `lib.rs`; проверить, что файлы существуют и `cargo check -p underlator-core` проходит
- [x] 1.2 Расширить `CoreError` вариантами `ProviderUnknown`, `ProviderUnsupported`, `ProviderCloudDisabled`, `ProviderCancelled` с rustdoc на русском; проверить `cargo doc -p underlator-core --no-deps` без ошибок missing docs
- [x] 1.3 Добавить в HTTP-клиент узкий метод для 2xx с пустым телом (`send_json_or_empty` или эквивалент) без вендорных путей; проверить mock-тест: DELETE 200 с пустым телом не падает на serde и мапится в успех
- [x] 1.4 Добавить `Default` для `ProviderConfig`: `id = "ollama"`, `url = "http://127.0.0.1:11434"`; проверить тест roundtrip JSON-ключей `id`/`url` и значения default

## 2. Trait, factory, stubs, privacy

- [x] 2.1 Описать object-safe trait `LlmProvider` (`generate_stream`, `stop`, `list_models`, `install_model`, `remove_model`, `provider_id`); проверить, что тип собирается как `Box<dyn LlmProvider>` (`cargo check -p underlator-core`)
- [x] 2.2 Реализовать factory/реестр по `provider_id` (нормализация lowercase): `ollama` и `embedded-ollama` → Ollama-адаптер, неизвестный id → `ProviderUnknown` без HTTP; проверить тесты: оба локальных id создают провайдера, `"unknown"` даёт `ProviderUnknown` и 0 исходящих запросов
- [x] 2.3 Реализовать `UnsupportedProvider` для `openrouter`/`anthropic` при `allow_cloud = true`: generate/list/install/remove → `ProviderUnsupported`, без исходящего HTTP; проверить тесты на оба id
- [x] 2.4 Отклонять облачный id при `allow_cloud = false` ошибкой `ProviderCloudDisabled` без HTTP; проверить тесты: `openrouter`/`anthropic` без opt-in не создаются, `ollama` без opt-in создаётся

## 3. OllamaProvider

- [x] 3.1 Реализовать `generate_stream` через `HttpClient` + NdJson на `{url}/api/generate`; тело без ключей `id`/`url`, default `temperature = 0.7` если поле не задано; проверить mock-тест: два chunk с `response`/`done`, путь `/api/generate`, в JSON-теле нет `id`/`url`
- [x] 3.2 Реализовать `list_models` как GET `{url}/api/tags` → `ListModelsResponse`; проверить mock-тест: ответ содержит `models[].name|size|modified_at`
- [x] 3.3 Реализовать `install_model` как POST `{url}/api/pull` с маппингом NDJSON `status` в `InstallProgress` и ошибкой при поле `error`; проверить mock-тест: кадры прогресса отдаются до EOF, chunk с `error` → доменная ошибка
- [x] 3.4 Реализовать `remove_model` как DELETE `{url}/api/delete`; пустой 2xx → `UnarySuccess { success: true }`; проверить mock-тест на пустое тело
- [x] 3.5 Реализовать `stop`: нет активной генерации → `Ok(())`; во время stream → прерывание и `ProviderCancelled` (или конец без новых токенов); проверить mock-тест, что после `stop` новые chunk не приходят

## 4. Boundaries and verification (DoD)

- [x] 4.1 Запретить `reqwest`/`hyper` в `src/provider/` (кроме тестов) и сохранить запрет в `model`/`catalog`/`chat`; проверить архитектурный тест импортов и что HTTP-клиент по-прежнему без именованных методов `/api/generate`
- [x] 4.2 Выполнить `cargo test -p underlator-core` и `cargo check --workspace` с кодом `0`; публичные items модуля `provider` имеют rustdoc на русском
- [x] 4.3 Убедиться, что нет use-case функций generate/CRUD/catalog fetch, нет embeddings/show/health, в host-crates нет исходящего HTTP к LLM и MVP routes/commands из этого атома, `electron-app/` и `react-app/` не изменены этим атомом, `underlator-core` не зависит от `tauri`/`axum`

## Definition of Done (DoD)

Change `llm-provider-ollama-2-2` считается выполненным **только если** все пункты ниже истинны:

1. В `underlator-core` есть абстракция LLM-провайдера с операциями `generate_stream`, `stop`, `list_models`, `install_model`, `remove_model`
2. Есть runtime-адаптер Ollama поверх unified `HttpClient` (пути `/api/generate`, `/api/tags`, `/api/pull`, `/api/delete`); исходящий HTTP не обходит клиент и не импортирует `reqwest`/`hyper` из модуля провайдера
3. Factory выбирает реализацию по `provider_id`: `ollama` и `embedded-ollama` — Ollama; неизвестный id — ошибка; `openrouter`/`anthropic` — stubs (unsupported) только при явном opt-in
4. Default конфиг: `id = "ollama"`, `url = "http://127.0.0.1:11434"`; JSON-ключи `id`/`url` совместимы с `ElectronApiConfig`
5. Облако без opt-in не создаётся; UI-предупреждение не реализуется
6. Mock-тесты покрывают generate stream, list, install progress, remove (пустое тело), stop, unknown id, cloud opt-in/stub
7. `cargo test -p underlator-core` и `cargo check --workspace` завершаются с кодом `0`; публичные items имеют rustdoc на русском
8. **Не** реализованы: use-cases `model`/`catalog`/`chat`, Axum routes, Tauri commands, RAG, embeddings/show/health, правки React
9. `electron-app/` и `react-app/` не требуют правок этого атома
10. Все чекбоксы в этом `tasks.md` отмечены `[x]`

## Out of scope (явно не делать)

- Атом 2.3 (use-cases model/catalog/chat)
- Атомы 3.x / 4.x / 5.x (Axum, BackendClient, Tauri commands)
- RAG, splash, embeddings, `/api/show`, health-check, выпил Electron
- Полные адаптеры Claude/OpenRouter и UI opt-in предупреждение
