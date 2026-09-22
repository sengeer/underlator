# Design

## Context

См. `proposal.md` (Why) и delta-спеку `mvp-ux-server-acceptance`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §4.2. Контракт: атомы 3.1 (`server-http-adapter`) и 4.1 (`react-backend-client`).

Наблюдение (код, не план):

- Compose `docker/docker-compose.yml`: server `:8080` + Ollama `:11434`, `OLLAMA_BASE_URL=http://ollama:11434`, `UNDERLATOR_BIND=0.0.0.0:8080`, `UNDERLATOR_AUTH_TOKEN=dev-change-me`, volume `/data`. CORS в `underlator-server` нет.
- `docker/Dockerfile` собирает `react-app` **без** `VITE_BACKEND_*`. Пустой mode → detect HTTP; пустой URL → same-origin `/api`; пустой token → **нет** `Authorization` → `/api/*` на compose = **401**. Это дыра стенда 4.2, не новая фича.
- `HttpTransport` уже мапит карту 3.1 (REST + SSE `model:generate-progress` / `model:install-progress` + `result`; Bearer из `VITE_BACKEND_TOKEN`). Vite `:8000` **не** проксирует `/api` → split-origin упрётся в CORS.
- Call sites MVP: `feature-provider` / `use-model.stop` / `chat-ipc` / `model-and-catalog-ipc` → `getBackendClient()`. Исключения: `widgets/settings/tests/model-ipc.ts` (`testGenerateText` ещё `window.electron.model`); `chat-sidebar` delete сначала зовёт `ragIpc.deleteDocumentCollection` (бросок без `window.electron` **блокирует** `deleteChat`).
- UI: чат (list/create/get/delete/addMessage + generate/stop); Settings → ManageModels (catalog get/search, install/remove/list); Settings → Tests (все 14 операций, включая `update` и `getModelInfo`). `chat.update` в основном виджете чата отдельной кнопки не имеет.
- Известные толерантности 4.1 (не чинить, пока сценарий не падает): `stop` тело `null`; обрыв SSE без `result` = reject.

## Goals / Non-Goals

**Goals:**

- Канонический стенд compose + same-origin SPA; документированный Vite-dev путь с env
- Чеклист UX с воспроизводимыми шагами; `ACCEPTANCE.md` pass/fail
- Точечные фиксы только по падению сценария (401 token, RAG на delete, Electron в Tests, JSON/SSE mismatch)

**Non-Goals:**

- Новая архитектура клиента, новые use-cases, WebSocket, Tauri host, выпил Electron, RAG/PDF, IAM, косметический FSD

## Decisions

1. **Канонический стенд — compose same-origin, не Vite↔8080 как DoD**  
   Оператор: `docker compose -f docker/docker-compose.yml up --build`, браузер `http://127.0.0.1:8080`. SPA и API один origin → CORS не нужен. Auth: token compose MUST попасть в static (см. решение 2).  
   *Альтернатива:* только Vite `:8000` + `VITE_BACKEND_URL=http://127.0.0.1:8080` как единственная приёмка — требует CORS на Axum или proxy; расходится с production dual-mode (static из server). Отклонено как канон.

2. **Token SPA = token server (точечный фикс стенда)**  
   Compose уже fail-closed на `0.0.0.0` без секрета. Dockerfile **ARG/ENV** на stage `ui`: `VITE_BACKEND_TOKEN` (default = `dev-change-me`, как compose) и при необходимости `VITE_BACKEND_MODE=http`. `VITE_BACKEND_URL` в образе пустой (same-origin). Compose MAY прокинуть build-arg, чтобы secret не разъехался.  
   *Альтернатива:* ослабить auth compose до loopback без token — ломает контракт 3.1. Отклонено.  
   *Альтернатива:* runtime-инжект секрета в `index.html` — лишний механизм. Отклонено, пока ARG достаточен.

3. **Vite-dev — второй путь, через proxy, не через CORS host**  
   Документировать `.env` / команду: `VITE_BACKEND_MODE=http`, `VITE_BACKEND_URL` пустой или origin server, `VITE_BACKEND_TOKEN=dev-change-me`. Чтобы браузер не бил в другой origin, Vite **MAY** получить `server.proxy['/api']` и `/healthz` → `http://127.0.0.1:8080` (helper 4.1, теперь нужен для живого UI). CORS на Axum — **только если** proxy недостаточен и сценарий падает.  
   *Альтернатива:* сразу `tower-http` CORS на server — шире, чем дыра. Отклонено до факта падения.

4. **Поверхности сценариев (UI, не сырой curl как основной путь)**  

   | Операция | Канон UX | Запас (тот же HTTP-клиент) |
   | --- | --- | --- |
   | chat list/create/get/delete/addMessage | виджет чата + sidebar | Settings → Tests (`chat-ipc` уже через `BackendClient`) |
   | chat update | Settings → Tests `testUpdateChat` | — (в sidebar нет rename) |
   | generate / stop | чат / переводчик (`feature-provider`, `use-model.stop`) | Tests generate **после** перевода на `BackendClient` |
   | model list/install/remove + install progress | Settings → ManageModels | Tests `model-and-catalog-ipc` |
   | catalog get/search | ManageModels (загрузка + поиск) | Tests |
   | catalog getModelInfo | Tests `testGetModelInfo` | ManageModels, если карточка дергает info |

   Curl/`GET /healthz` — диагностика стенда, не замена UX.  
   *Альтернатива:* принять только curl к `/api` — не доказывает dual-mode UI. Отклонено.

5. **Модель для generate/install — маленькая, явная**  
   Default приёмки: `qwen3:0.6b` (уже `OLLAMA_TEST_MODEL` в settings tests). Install идёт в sidecar Ollama (сеть обязательна для pull). Повторный install той же модели = progress до complete, не ошибка стенда. Remove — ту же модель; после remove generate этой модели MUST падать провайдером, не контрактом.  
   *Альтернатива:* требовать уже предустановленную модель без install — не закрывает сценарий install progress. Отклонено как единственный путь.

6. **Политика точечных фиксов контракта**  
   Падение → строка в `ACCEPTANCE.md` (симптом, фактический JSON/SSE vs ожидание TS/Rust, файл). Фикс минимальный: клиентский разбор **или** host serialize **или** имя поля DTO, если ключ реально разъехался. Запрещено: новые use-cases, новые path вне карты 1.2/3.1, SSE→WS, «заодно» FSD. После фикса — повтор сценария. Если падает только стенд (Ollama down) — статус `blocked`, не `fail` контракта. Известные 4.1 (`stop`=`null`, close без `result`=reject) чинить на host **только если** UX из-за них красный.  
   *Альтернатива:* заранее патчить mid-stream SSE error 3.1 — вне доказанного падения. Отклонено.

7. **Дыры, которые почти наверняка чинить в apply (не ждать сюрприза)**  
   - **401 static:** решение 2.  
   - **Delete + RAG:** `chat-sidebar` MUST вызывать `deleteChat` даже если `ragIpc` бросает / нет `window.electron`; не реализовывать RAG.  
   - **Tests generate:** `testGenerateText` перевести на `getBackendClient().model` (progress `onGenerateProgress`), иначе запасной путь generate в Tests мёртв в web. Остальные Tests model уже через `modelAndCatalogIpc`.  
   Это не рефакторинг FSD, а разблокировка обязательных сценариев.

8. **Отчёт `ACCEPTANCE.md` в change**  
   Путь: `openspec/changes/mvp-ux-server-acceptance-4-2/ACCEPTANCE.md`. Таблица: сценарий | поверхность | статус (`pass`/`fail`/`blocked`) | заметка (фиксы, commit, внешний блокер). Не дублировать полный лог SSE. Копия в `.cursor/docs` **не** обязательна (трекер «что выполнено» обновляется человеком после archive).  
   *Альтернатива:* только абзац в design — нельзя сдать DoD без прогона. Отклонено.

9. **Границы hex и регрессия**  
   Правки core — только доказанный mismatch DTO в существующих типах; слой `application` без новых use-cases. Host — serialize/auth/static/env, без исходящего Ollama. После Rust-фикса: `cargo test -p underlator-core` (включая architecture) и `cargo test -p underlator-server`. После TS-фикса: `npm run type:check` и unit-тесты клиента. Electron happy-path не ломать (`ElectronTransport` остаётся).

10. **Стоимость**  
    Приёмка — ручной O(число сценариев) прогон. Фиксы разбора JSON/SSE не добавляют буфер всего потока (как 4.1). Не ставить автоматический Playwright в DoD этого атома (нет такого требования плана).

## Risks / Trade-offs

- **Первый `docker compose up --build` долог + pull модели** → Mitigation: маленький `qwen3:0.6b`; в отчёте фиксировать время/блокер сети отдельно от контракта.
- **Каталог library HTTP зависит от внешней сети** → Mitigation: `get`/`search` против живого library; при outage — `blocked`, не молчаливый skip без строки отчёта.
- **Single-flight generate на процесс** (3.1) → Mitigation: не параллелить два generate в чеклисте; stop затем новый generate.
- **Имена моделей с `/` в path** → Mitigation: для приёмки имена без `/`; `encodeURIComponent` уже в клиенте; карту не менять.
- **RAG-кнопки в UI отвлекают** → Mitigation: не открывать PDF/RAG; delete не должен требовать RAG.
- **Запечённый dev-token в образе** → Mitigation: как compose 3.1, не для прода; не строить IAM.

## Migration Plan

- Стенд: compose up → приёмка → `ACCEPTANCE.md`. Rollback фиксов = revert коммитов 4.2; 3.1/4.1 не откатывать.
- Electron: без выпила; default Vite flag пустой = detect.
- Данные: volume `underlator-data`; тестовые чаты можно удалить сценарием delete.
- Дальше: атом 5.1 (Tauri) на том же MVP; не блокировать 5.1 косметикой UI.

## Open Questions

Нет. Канон стенда (compose same-origin), модель (`qwen3:0.6b`), путь отчёта и политика фиксов зафиксированы выше.
