# Tasks

## 1. Module skeleton and errors

- [x] 1.1 Разложить stub `http.rs` в `crates/underlator-core/src/http/` (`mod.rs`, `config`, `request`, `retry`, `stream`, `trace`), реэкспортировать `http` из `lib.rs`; проверить, что файлы существуют и `cargo check -p underlator-core` проходит
- [x] 1.2 Расширить `CoreError` вариантами HTTP (`HttpTimeout`, `HttpNetwork`, `HttpStatus`, `HttpRetryExhausted`, `HttpStream`, `HttpConfig`) с rustdoc на русском; проверить `cargo doc -p underlator-core --no-deps` без ошибок missing docs
- [x] 1.3 Добавить `tokio` feature `time` (workspace при необходимости) и `dev-dependency` mock HTTP (`wiremock` или эквивалент) в `underlator-core`; проверить, что `cargo check -p underlator-core` проходит и `hyper` не добавлен как прямая зависимость

## 2. Config, unary JSON, timeout, retry

- [x] 2.1 Реализовать `HttpClientConfig` / `HttpAuth` / `RetryPolicy` / опциональный proxy как данные (без полей `provider_id` и без путей Ollama) и `HttpClient::from_config`; проверить тест: клиент собирается с custom `base_url`, `Debug` конфига не содержит bearer-токен
- [x] 2.2 Реализовать `send_json` (метод + относительный path + JSON body, заголовки из конфига и `HttpAuth::Bearer`); проверить mock-тест: POST JSON 200, тело и заголовки (`Authorization`, custom header) доходят, ответ десериализуется
- [x] 2.3 Замапить транспортные и статусные сбои в `CoreError` без публичных типов `reqwest`; проверить тесты: 404 → `HttpStatus { status: 404 }`, недоступный endpoint → `HttpNetwork` или `HttpConfig`/`Internal` HTTP-слоя без паники
- [x] 2.4 Включить timeout на unary-операцию из конфига; проверить mock-тест с задержкой дольше timeout → `HttpTimeout`
- [x] 2.5 Реализовать retry unary (default 3 / 1s / ×2 / max 10s): retry 429/503/сеть/timeout, не retry прочие 4xx; проверить тесты: 503 затем 200 → успех и ≥2 запроса; 400 → ровно 1 запрос и `HttpStatus`

## 3. Stream adapters

- [x] 3.1 Реализовать `send_stream` + режим NdJson (кадры по `\n`, без `serde_json` на кадре, хвост буфера O(незакрытый кадр)); проверить mock-тест: два JSON-line кадра отдаются до EOF, первый кадр доступен до закрытия тела
- [x] 3.2 Реализовать SSE-адаптер (`data:` события); проверить mock-тест: два события отдаются отдельными кадрами
- [x] 3.3 Реализовать Raw/chunked режим без JSON-парсинга; проверить mock-тест: тело отдаётся фрагментами `Bytes`
- [x] 3.4 Не ретраить stream после первого кадра; проверить mock-тест: после первого кадра обрыв → `HttpStream` и ровно один исходящий запрос

## 4. Tracing and import boundary

- [x] 4.1 Добавить трассировку method/host/path/status/duration/attempt без тел и `Authorization` по умолчанию; проверить тест с capturing subscriber: в событиях есть метод, нет текста промпта и значения токена
- [x] 4.2 Запретить прямые `reqwest`/`hyper` вне `src/http/`; проверить архитектурный тест, что `model`/`catalog`/`chat`/`contract`/`events`/`rag`/`splash` не импортируют эти crates, и что публичный модуль `http` не делает `pub use reqwest`

## 5. Verification (DoD)

- [x] 5.1 Выполнить `cargo test -p underlator-core` и `cargo check --workspace` с кодом `0`
- [x] 5.2 Убедиться, что нет `OllamaProvider` и use-case функций generate/CRUD/catalog fetch, в host-crates нет исходящего HTTP к LLM и MVP routes/commands из этого атома, `electron-app/` и `react-app/` не изменены этим атомом, `underlator-core` не зависит от `tauri`/`axum`

## Definition of Done (DoD)

Change `unified-http-client-2-1` считается выполненным **только если** все пункты ниже истинны:

1. В `crates/underlator-core` есть единый исходящий HTTP-клиент с конфигом как данными (base URL, headers, auth, timeout, retry, proxy-ready)
2. Клиент выполняет unary JSON и stream (Raw / NdJson / SSE) через mock-тесты; вендорный разбор Ollama generate-chunk отсутствует
3. Timeout и retry работают по спецификации (retry только временных сбоев; stream после первого кадра не ретраится)
4. Сбои мапятся в `CoreError` HTTP-варианты; публичный API не экспортирует типы `reqwest`/`hyper`
5. Трассировка по умолчанию не содержит тел промптов и значений Authorization / API keys
6. Модули `model`/`catalog`/`chat` не импортируют `reqwest`/`hyper`; исходящий HTTP ядра идёт только через клиент
7. `cargo test -p underlator-core` и `cargo check --workspace` завершаются с кодом `0`; публичные items имеют rustdoc на русском
8. **Не** реализованы: `OllamaProvider`, use-cases `model`/`catalog`/`chat`, Axum routes, Tauri commands, RAG, правки React
9. `electron-app/` и `react-app/` не требуют правок этого атома
10. Все чекбоксы в этом `tasks.md` отмечены `[x]`

## Out of scope (явно не делать)

- Атом 2.2 (абстракция LLM provider / Ollama)
- Атом 2.3 (use-cases model/catalog/chat)
- Атомы 3.x / 4.x / 5.x (Axum, BackendClient, Tauri commands)
- RAG, splash, embeddings, выпил Electron
- Именованные методы клиента под `/api/generate`, `/api/tags` и прочие vendor endpoints
