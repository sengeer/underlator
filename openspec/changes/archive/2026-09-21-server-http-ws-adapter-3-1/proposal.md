# Proposal

## Why

Атомы 2.3–2.4 уже дали исполняемые use-cases MVP и гексагональное ядро, но `underlator-server` остаётся каркасом (`/healthz`, loopback bind), а `docker/` — заглушками. Без inbound HTTP-адаптера нет docker/web-режима: desktop ещё на Electron, а те же `model` / `catalog` / `chat` нельзя вызвать по сети. Сейчас — атом 3.1: тонкий Axum-host над существующим application/ports API.

## What Changes

- Поднять Axum app в `underlator-server` как **driving/inbound adapter**: разбор HTTP → вызов `ModelService` / `CatalogService` / `ChatService` → JSON (без доменных правил и без прямого `reqwest`/Ollama)
- Смапить REST/JSON на 14 операций MVP по карте имён ядра (`/api/model/*`, `/api/catalog/*`, `/api/chat/*`); ошибки — через `host_error_class` в HTTP-статус
- Отдавать progress generate/install потоком (транспорт фиксируется в design; не дублировать события в core)
- В production отдавать static build `react-app` (SPA fallback); UI-транспорт `BackendClient` **не** переводится (атом 4.x)
- Конфиг host: bind, data dir (`StorageRoot`), Ollama base URL, provider defaults, каталог static, auth
- Минимальный auth-задел (Bearer token и/или HTTP Basic): обязателен до публичного bind `0.0.0.0`; не multi-user модель
- Заменить docker-stubs на рабочий `docker/Dockerfile` + `docker-compose` (server + Ollama) с volume `/data`
- Соблюдать hex 2.4: новая бизнес-логика в core не добавляется; server не обходит ports
- **Не** делать: React `BackendClient` / перевод UI, Tauri commands, RAG, splash, выпил Electron, полную multi-user модель как у Open WebUI

## Capabilities

### New Capabilities

- `server-http-adapter`: HTTP/SSE inbound adapter в `underlator-server` над application/ports API ядра (REST MVP, streaming progress, static SPA, конфиг, auth-задел, docker compose)

### Modified Capabilities

- `hexagonal-core`: снимается запрет «после 2.4 server не объявляет MVP HTTP routes»; host остаётся driving adapter, но 3.1 MUST смапить `model` / `catalog` / `chat` на use-cases без доменной логики и без `reqwest`/Ollama в server
- `rust-workspace`: `docker/Dockerfile` и `docker-compose` перестают быть заглушками: multi-stage образ server+static UI и compose (server + Ollama + volume данных)

## Impact

- Код: в основном `crates/underlator-server` (роутер, handlers, конфиг, auth middleware, static, wiring core); `docker/Dockerfile`, `docker/docker-compose.yml`; точечные правки `Cargo.toml` workspace/host (serde, tower-тесты, SSE). `underlator-core` — без новой бизнес-логики; допустимы только реэкспорт/мелочи, если host не может вызвать уже существующий API
- Зависимости: `axum` уже в workspace; core по-прежнему без `axum`/`tauri`. Server MUST NOT добавлять `reqwest` для LLM
- Поведение Electron/React **не** меняется этим атомом; UI в docker-образе может не ходить в API, пока нет атома 4.x
- Следующий атом 4.x подключает `BackendClient` (fetch + SSE) к этим маршрутам
