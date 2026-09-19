# Design

## Context

См. `proposal.md` (Why) и delta-спеку `unified-http-client`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §2.1.  
Наблюдение: `crates/underlator-core/src/http.rs` — stub (`reqwest::Client` + user-agent, без I/O). Workspace уже тянет `reqwest` с `json` / `rustls-tls` / `stream`. Живой HTTP — Electron `OllamaApi` + `withRetry` / `processStreamResponse` (NDJSON по `\n`, retry 3 / 1s / ×2 / max 10s). DTO MVP (атом 1.2) уже в core; use-cases и провайдер ещё не существуют.

## Goals / Non-Goals

**Goals:**

- Заменить stub рабочим клиентом: конфиг как данные, timeout, retry, доменные HTTP-ошибки, unary JSON и stream-кадры
- Публичный API без утечки типов `reqwest`/`hyper`; `reqwest` только внутри модуля `http`
- Тесты на mock HTTP (без живой Ollama) + архитектурный тест границы импортов
- Трассировка method/host/path/status/duration без тел и секретов по умолчанию

**Non-Goals:**

- `OllamaProvider`, реестр провайдеров, вызовы `/api/generate` как именованные методы
- Use-cases `model` / `catalog` / `chat` и парсинг generate-chunk (`response`/`done`)
- Входящий HTTP (Axum), Tauri commands, React, RAG, выпил Electron
- Полноценный OAuth, mTLS, HTTP/2 tuning, circuit breaker

## Decisions

1. **Эволюция `http` модуля, не новый crate**  
   Разложить stub `http.rs` в `src/http/` (`mod.rs`, `config`, `request`, `retry`, `stream`, `trace`). `reqwest` остаётся транспортом (уже в workspace).  
   *Альтернатива:* отдельный `underlator-http` crate — лишний member вне плана. Отклонено.

2. **Конфиг и запрос — данные, не провайдер**  
   ```text
   HttpClientConfig { base_url, default_headers, auth, timeout, retry, proxy }
   HttpAuth { None | Bearer(token) | Header { name, value } }
   RetryPolicy { max_attempts, base_delay, backoff_multiplier, max_delay }
   HttpRequest { method, path, query, headers, body }
   StreamMode { Raw | NdJson | Sse }
   ```  
   Base URL + относительный path (без зашитых `OLLAMA_ENDPOINTS`). Auth — заголовок из данных. Proxy URL опционален: если задан, `reqwest` Proxy на builder; иначе прямой выход.  
   *Альтернатива:* методы `generate()`/`list_models()` на клиенте — смешает атом 2.1 с 2.2. Отклонено.

3. **Публичный API без типов HTTP-crate**  
   `HttpClient::from_config` / `send_json` / `send_stream`. Тело unary — `serde` типы или `Bytes`; stream — `Stream<Item = Result<Bytes, CoreError>>` (или тонкая обёртка кадра). Не `pub use reqwest`. `Debug` у конфига редактирует `auth` и значения секретных заголовков.  
   *Альтернатива:* реэкспорт `reqwest::Response` — сломает границу и привяжет use-cases к crate. Отклонено.

4. **Timeout: unary полный; stream — до заголовков + idle между кадрами**  
   Unary: один `timeout` на всю операцию (default 30s, из конфига). Stream: тот же timeout на установку ответа (connect + headers); далее idle-timeout между кадрами default **60s** (как Electron `streamTimeout`), без лимита на полную длительность генерации. Отмена = drop future.  
   *Альтернатива:* общий timeout на весь stream — убьёт длинную generate. Отклонено.

5. **Retry как в Electron, только unary и pre-frame stream**  
   Default: `max_attempts = 3`, `base_delay = 1s`, `multiplier = 2`, `max_delay = 10s`. Retryable: сеть, timeout, HTTP 429, HTTP 503. Не retry: 400/401/403/404/409 и прочие 4xx кроме 429. Тело unary хранить как `Bytes` и повторять без лишних clone сверх попытки. Stream: retry только если ошибка **до** первого кадра; после первого кадра — `HttpStream` без автоповтора.  
   *Альтернатива:* не ретраить POST — расходится с текущим `OllamaApi.generate` + `withRetry`. Отклонено для паритета.

6. **Маппинг ошибок в `CoreError`**  
   Расширить `error.rs` (не отдельный публичный HTTP error-crate): `HttpTimeout`, `HttpNetwork`, `HttpStatus { status, .. }`, `HttpRetryExhausted`, `HttpStream`, `HttpConfig`. Тело ошибки сервера — усечённый snippet, не полный prompt. Вызывающий код матчит `CoreError`, не `reqwest::Error`.  
   *Альтернатива:* `thiserror` обёртка вокруг `reqwest::Error` в публичном API — утечка. Отклонено.

7. **Stream-адаптеры — кадры байт, не вендорный JSON**  
   Общий `bytes_stream`; поверх: Raw (как есть), NdJson (split `\n`, пустые строки drop, **без** `serde_json` на кадре), Sse (события, отдача payload `data:`). Инкрементальный буфер O(размер незакрытого кадра), не collect всего тела. Парсинг Ollama chunk — атом 2.2.  
   *Альтернатива:* сразу `serde_json::Value` на NDJSON — навяжет JSON всем провайдерам и смешает слои. Отклонено.

8. **Трассировка без тел**  
   `tracing` span/event: method, host, path (без userinfo), status, `duration_ms`, `attempt`. Заголовки `Authorization` / `Proxy-Authorization` и значения `HttpAuth` не логировать. Тела — только если явно включён debug-флаг конфига (default off); даже тогда auth redact.  
   *Альтернатива:* логировать JSON body «для отладки провайдера» по умолчанию — риск промптов. Отклонено.

9. **Граница `reqwest`/`hyper` проверяется тестом**  
   `use reqwest` / `use hyper` разрешены только под `src/http/`. Тест читает исходники `model`/`catalog`/`chat`/`contract`/`events`/`rag`/`splash` и падает при импорте. Host-crates в этом атоме исходящий HTTP к LLM не добавляют.  
   *Альтернатива:* только rustdoc-запрет — недостаточно для DoD. Отклонено.

10. **Тесты и deps**  
    `dev-dependency`: `wiremock` (или эквивалент) + `tokio` с `time`. Сценарии: unary 200 JSON; custom header + bearer; 404 → `HttpStatus`; 503 затем 200 → retry; 400 без retry; timeout; NDJSON два кадра до EOF; SSE два `data:`; обрыв после первого кадра без retry. Живая сеть/Ollama не нужны. Добавить workspace feature `tokio` `time`, если его ещё нет. Не добавлять `hyper` как прямую зависимость.

11. **Стоимость**  
    Горячий путь stream: poll chunk → scan на `\n`/`\n\n`, без O(n²) пересборки всего буфера (хранить только хвост незакрытого кадра). Не clone `String` тела на успешном unary. `HttpClient` Clone через внутренний `reqwest::Client`.

## Risks / Trade-offs

- **Idle-timeout на stream оборвёт «молчащую» модель** → Mitigation: 60s как сейчас в Electron; значение в конфиге.
- **Retry POST generate может дублировать работу на сервере** → Mitigation: паритет с Electron; провайдер 2.2 может сузить политику per-operation.
- **Самописный SSE** vs crate → Mitigation: минимальный parser + тесты; полный eventsource не нужен до облачных провайдеров.
- **wiremock + async** увеличит время `cargo test -p underlator-core` → Mitigation: только HTTP-модуль, localhost, без sleep больше backoff теста (можно `tokio::time::pause` если стабильно).
- **Соблазн сразу написать Ollama** → Mitigation: DoD и spec запрещают named endpoints и provider.

## Migration Plan

- Только аддитивно внутри `underlator-core` (замена stub). Rollback = revert коммита атома.
- Electron/React не мигрируют. Следующее потребление: атом 2.2 (`OllamaProvider` вызывает `send_json` / `send_stream`).

## Open Questions

Нет. Выбор wiremock vs httpmock — деталь реализации, на спецификацию не влияет.
