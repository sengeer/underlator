# Design

## Context

См. `proposal.md` (Why) и delta-спеки `llm-provider` / `unified-http-client`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §2.2.  
Наблюдение: `underlator-core` уже имеет DTO `ProviderConfig` / `GenerateRequest` (`id`, `url`) и unified `HttpClient` (`send_json` / `send_stream` + NdJson). Живой вендорный HTTP — Electron `OllamaApi` (`/api/generate`, `/api/tags`, `/api/pull`, `/api/delete`); `stop` живёт в `ModelHandlers` через `AbortController`, не внутри `OllamaApi`. Use-cases 2.3 ещё нет. React settings: `id: "ollama"` и `id: "embedded-ollama"` при одном и том же локальном URL.

## Goals / Non-Goals

**Goals:**

- Trait провайдера + `OllamaProvider` на `HttpClient` + factory по `provider_id`
- Тесты на mock HTTP без живой Ollama; архитектурный тест: провайдер не импортирует `reqwest`/`hyper`
- Политика default = локальный Ollama; облако только с opt-in-флагом в данных конфига ядра

**Non-Goals:**

- Use-cases `model` / `catalog` / `chat` (атом 2.3) и оркестрация «текущей» генерации на уровне IPC
- Embeddings, `/api/show`, health-check, splash/embedded lifecycle
- Полные адаптеры OpenRouter/Anthropic, UI-предупреждение, Axum/Tauri/React

## Decisions

1. **Модуль `provider` в `underlator-core`, не новый crate**  
   ```text
   crates/underlator-core/src/provider/
     mod.rs          # реэкспорт
     port.rs         # trait LlmProvider
     factory.rs      # реестр / create(config)
     config.rs       # ProviderFactoryConfig, default id/url, allow_cloud
     ollama.rs       # OllamaProvider + вендорные пути
     stub.rs         # UnsupportedProvider
     tests.rs
   ```  
   Вендорные константы путей — только в `ollama.rs`. `HttpClient` по-прежнему без `provider_id`.  
   *Альтернатива:* методы `generate()` на HTTP-клиенте — смешает 2.1 и 2.2. Отклонено.

2. **Object-safe trait + factory → `Box<dyn LlmProvider>`**  
   Операции: `generate_stream`, `stop`, `list_models`, `install_model`, `remove_model` (+ `provider_id()` для трассировки). Stream generate/install — `Stream<Item = Result<GenerateProgress|InstallProgress, CoreError>>` (уже существующие DTO/`events`). Для object-safety — `async-trait` (маленькая dep) либо вручную `Pin<Box<dyn Future>>`; предпочтение `async-trait`, чтобы mock в тестах 2.3 не плодил boilerplate.  
   *Альтернатива:* enum `Ollama | Stub` без trait — каждый новый адаптер трогает все match. Отклонено (OCP плана: новый вендор = новый адаптер + запись в реестр).

3. **Реестр по строковому `provider_id`, не по React `ProviderType`**  
   Нормализация trim + lowercase. Карта:  
   - `ollama`, `embedded-ollama` → `OllamaProvider` (один адаптер; splash/embedded — вне скоупа)  
   - `openrouter`, `anthropic` → `UnsupportedProvider`, только если `allow_cloud == true`  
   - иначе → `CoreError::ProviderUnknown`  
   Default без явного id: `ollama` + `http://127.0.0.1:11434`. `allow_cloud` default `false`. UI предупреждения нет; флаг — данные ядра для будущих hosts.  
   *Альтернатива:* резолвить display-имена `"Embedded Ollama"` — это UI-слой, не ElectronApiConfig.id. Отклонено.

4. **`OllamaProvider` держит `HttpClient`, собранный из `url`**  
   `HttpClientConfig { base_url: config.url, ..Default::default() }` (retry/timeout/idle как в 2.1). Generate: POST `api/generate`, `StreamMode::NdJson`, кадр → `GenerateProgress` через `serde_json` **в адаптере**. Тело: поля generate без `id`/`url`; если `temperature` нет — `0.7` как `OLLAMA_DEFAULT_OPTIONS`. List: GET `api/tags` → `ListModelsResponse`. Install: POST `api/pull`, NdJson → `InstallProgress` (маппинг свободной строки Ollama `status` в enum `downloading|verifying|writing|complete`; поле `error` → доменная ошибка). Remove: DELETE `api/delete`.  
   *Альтернатива:* парсить generate-chunk в HTTP-клиенте — запрещено спекой 2.1. Отклонено.

5. **Пустой 2xx на DELETE — расширение HTTP-клиента, не обход**  
   `send_json` сейчас падает на пустом теле. Добавить в модуль `http` узкий метод вроде `send_status` / `send_json_or_empty<T: Default>`: 2xx + пустое тело → `T::default()` или `UnarySuccess { success: true }`. Провайдер вызывает только публичный API `http`.  
   *Альтернатива:* `reqwest` в `ollama.rs`. Отклонено спекой.

6. **`stop` на экземпляре провайдера**  
   Как Electron abort: флаг/токен отмены + drop HTTP-stream. Нет активной операции — `Ok(())` (no-op). Отмена generate → `CoreError::ProviderCancelled` (или завершение stream без новых chunk — оба допустимы спекой; реализация: ошибка отмены на следующем poll, чтобы вызывающий код отличил cancel от обрыва сети). Один in-flight generate на экземпляр (как `currentAbortController`).  
   *Альтернатива:* только drop stream без метода `stop` — сломает паритет preload `model.stop`. Отклонено.

7. **Ошибки в `CoreError`**  
   Добавить варианты (rustdoc по-русски): `ProviderUnknown { id }`, `ProviderUnsupported { id, operation }`, `ProviderCloudDisabled { id }`, `ProviderCancelled`. HTTP-ошибки не маскировать: провайдер пробрасывает `HttpStatus`/`HttpStream` и т.д.  
   *Альтернатива:* отдельный `ProviderError` crate. Лишний слой. Отклонено.

8. **Граница импортов**  
   Расширить архитектурный тест: `src/provider/**` (кроме тестов) не содержит `use reqwest` / `reqwest::`. Модули `model`/`catalog`/`chat` по-прежнему без `reqwest` и **без** вызова Ollama endpoints (use-cases нет). Host-crates исходящий HTTP к LLM не добавляют.

9. **Стоимость**  
   Горячий путь generate: один NDJSON-кадр → один `serde_json` O(размер кадра), без конкатенации всего ответа в адаптере (конкатенация — use-case 2.3 / host, как сейчас `ModelHandlers`). Не clone промпта сверх сериализации тела.

10. **Тесты**  
    wiremock: generate два NDJSON-chunk; тело без `id`/`url`; list; pull stream → InstallProgress; DELETE пустое тело → success; stop прерывает поток; unknown id; cloud без opt-in; stub generate → unsupported. Живая Ollama не нужна.

## Risks / Trade-offs

- **Маппинг `status` pull не совпадает 1:1 с enum UI** → Mitigation: эвристика по подстрокам + неизвестное → `Downloading`; поле `error` всегда ошибка.
- **`async-trait` в core** → Mitigation: только на порте провайдера; не тащить в HTTP-клиент. Если против dep — вручную boxed future, поведение то же.
- **Один in-flight на экземпляр** vs параллельные generate → Mitigation: паритет Electron; параллелизм — отдельный change / 2.3.
- **`embedded-ollama` = тот же HTTP-адаптер** может скрыть, что splash ещё не перенесён → Mitigation: rustdoc + spec явно; lifecycle — вне скоупа.
- **Retry POST generate на уровне HttpClient** может дублировать работу → Mitigation: как 2.1/Electron; use-case 2.3 может сузить retry per-operation.

## Migration Plan

- Только аддитивно в `underlator-core`. Rollback = revert коммита атома.
- Electron/React не мигрируют. Потребление: атом 2.3 вызывает `dyn LlmProvider`, а не `HttpClient` напрямую.

## Open Questions

Нет. Выбор `async-trait` vs boxed future — деталь реализации, на спецификацию не влияет.
