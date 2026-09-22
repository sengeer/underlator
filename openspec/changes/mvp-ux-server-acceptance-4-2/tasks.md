# Tasks

## 1. Stand: compose SPA auth and HTTP env

- [x] 1.1 Прокинуть в `docker/Dockerfile` (stage `ui`) ARG/ENV `VITE_BACKEND_TOKEN` с default `dev-change-me` и при необходимости `VITE_BACKEND_MODE=http`; `VITE_BACKEND_URL` оставить пустым (same-origin); проверить, что `npm run build` в этом stage видит token (grep ARG/ENV в Dockerfile, default совпадает с `UNDERLATOR_AUTH_TOKEN` в compose)
- [x] 1.2 Связать compose build-arg с `UNDERLATOR_AUTH_TOKEN` (или задокументировать, что default Dockerfile = `dev-change-me` как в compose) и проверить `docker compose -f docker/docker-compose.yml config`, что server по-прежнему `OLLAMA_BASE_URL=http://ollama:11434` и bind `0.0.0.0:8080`
- [x] 1.3 Добавить `react-app/.env.example` с `VITE_BACKEND_MODE=http`, `VITE_BACKEND_URL` (пусто = same-origin / для Vite proxy), `VITE_BACKEND_TOKEN=dev-change-me` и проверить, что файл не содержит иных секретов и имена совпадают с `ImportMetaEnv`
- [x] 1.4 Добавить Vite `server.proxy` для `/api` и `/healthz` → `http://127.0.0.1:8080` (dev helper, без CORS на Axum) и проверить по `vite.config.ts`, что proxy есть; CORS на server **не** добавлять, пока proxy не доказан недостаточным

## 2. Unblock known UX holes

- [x] 2.1 Сделать delete чата в `chat-sidebar` независимым от RAG: при отсутствии `window.electron.rag` / ошибке `ragIpc.deleteDocumentCollection` всё равно вызывать `deleteChat`; проверить, что в web без Electron sidebar delete доходит до `BackendClient.chat.delete` (тест или ручной шаг + отсутствие throw до thunk)
- [x] 2.2 Перевести `testGenerateText` в `widgets/settings/tests/model-ipc.ts` на `getBackendClient().model` (`onGenerateProgress` + `generate`), без `window.electron.model`; проверить `rg "window\\.electron\\.model" react-app/src/widgets/settings/tests` пустой и `npm run type:check` код 0
- [x] 2.3 Не реализовывать RAG/PDF; проверить, что нет новых маршрутов `rag`/`splash` в `underlator-server` и нет новой RAG-логики в `underlator-core`

## 3. Raise compose and smoke

- [x] 3.1 Собрать и поднять `docker compose -f docker/docker-compose.yml up --build` и проверить: контейнеры server + ollama running; `curl -sS http://127.0.0.1:8080/healthz` успех без модели
- [x] 3.2 Открыть `http://127.0.0.1:8080` в браузере и проверить: SPA грузится (не пустой 404); DevTools Network: MVP `/api/*` с `Authorization: Bearer` (не 401 на первом `list`/`catalog`); нет обращений к `window.electron.model|catalog|chat`
- [x] 3.3 (Опционально, не замена канона) Запустить Vite с `.env` из 1.3 против уже поднятого compose и проверить один унарный вызов (например list чатов или `GET /api/model/list` через UI) без CORS-ошибки

## 4. Chat scenarios on canonical stand

- [x] 4.1 В виджете чата: создать чат, увидеть в списке, открыть (get), отправить user-сообщение (addMessage) и проверить, что сущности видны в UI и Network — HTTP `/api/chat` (не Electron)
- [x] 4.2 Через Settings → Tests выполнить `testUpdateChat` (title) и проверить: успех HTTP `PATCH /api/chat/:id`; повторный get/list показывает новое title
- [x] 4.3 Удалить чат из sidebar в web-режиме (RAG недоступен) и проверить: чат исчез из списка; сценарий не требует успешного `rag.*`

## 5. Model scenarios (Ollama `qwen3:0.6b`)

- [x] 5.1 В Settings → ManageModels (или Tests) запустить install `qwen3:0.6b`, наблюдать install progress и проверить: кадры progress в UI/Network как SSE `model:install-progress`; завершение успеха (не WebSocket)
- [x] 5.2 Выполнить `model.list` (ManageModels / Tests) и проверить, что установленная модель есть в списке (`name` / размер)
- [x] 5.3 В чате (или переводчике) запустить generate на установленной модели и проверить: текст стримится; Network `POST /api/model/generate` `text/event-stream`; финал приходит; WebSocket нет
- [x] 5.4 Во время generate нажать stop и проверить: `POST /api/model/stop`; новые успешные токены не появляются; UI выходит из «идёт генерация»
- [x] 5.5 Удалить ту же модель (`remove`) и проверить: list больше не содержит её (или содержит без этого имени)

## 6. Catalog scenarios

- [x] 6.1 Открыть ManageModels: `catalog.get` загружает снимок и проверить ключи/список в UI без ошибки транспорта (`GET /api/catalog`)
- [x] 6.2 Ввести поисковую строку (`catalog.search`) и проверить, что список сужается или остаётся валидным снимком без ошибки HTTP-клиента
- [x] 6.3 Через Tests `testGetModelInfo`: известное имя → карточка; заведомо неизвестное → отсутствие (`null`), не фатальный UX-404; проверить Network `GET /api/catalog/models/:name`

## 7. Contract bugs and regression gates

- [x] 7.1 На каждое падение сценария из-за JSON/SSE (ключи, имена событий, `{ class, message }`, `result`): записать симптом в черновик отчёта, внести **точечный** фикс (клиент / host serialize / поле DTO), **не** добавляя use-cases / новых path / WebSocket; повторить сценарий до pass
- [x] 7.2 Если менялся Rust (`underlator-core` / `underlator-server`): прогнать `cargo test -p underlator-core` (включая `--test architecture`), `cargo test -p underlator-server` с кодом 0; если core не трогали — явно отметить в отчёте, что прогон architecture не требовался **либо** всё равно прогнать
- [x] 7.3 Если менялся `react-app`: прогнать `npm run type:check` и unit-тесты клиента (`npx vitest run` в `react-app`) с кодом 0
- [x] 7.4 Проверить границы атома: нет MVP commands в `underlator-tauri`; `ElectronTransport` и `electron-app/` на месте; нет выпила Electron; нет новых RAG/splash routes; `rg "WebSocket|new WebSocket" react-app/src/shared/api` пустой (или только комментарий)

## 8. Acceptance report

- [x] 8.1 Создать `openspec/changes/mvp-ux-server-acceptance-4-2/ACCEPTANCE.md`: как поднят стенд (compose, URL, env/token); таблица сценариев list/create/get/update/delete/addMessage, generate/stop/list/install/remove, catalog get/search/getModelInfo со статусом `pass` / `fail` / `blocked` и заметкой (фиксы, внешний блокер)
- [x] 8.2 Убедиться, что обязательные строки не `fail`; `blocked` только при внешней причине стенда (Docker/сеть/Ollama), записанной явно; RAG/PDF строк в отчёте нет как обязательных
- [x] 8.3 Отметить все чекбоксы этого `tasks.md` как `[x]` после фактического выполнения (не заранее)

## Definition of Done (DoD)

Change `mvp-ux-server-acceptance-4-2` считается выполненным **только если** все пункты ниже истинны:

1. Стенд server/docker воспроизводим: `docker compose -f docker/docker-compose.yml up` поднимает server + Ollama; `GET /healthz` успешен; SPA на `:8080` ходит в `/api` через HTTP (`BackendClient` / `HttpTransport`), с Bearer если secret включён
2. Задокументированы env React: `VITE_BACKEND_MODE=http`, `VITE_BACKEND_URL`, опционально `VITE_BACKEND_TOKEN` (`.env.example` и/или Dockerfile ARG)
3. Сценарии chat прошли в web-UX: list / create / get / update / delete / addMessage; delete не требует RAG
4. Сценарии model прошли: generate SSE (не WebSocket), stop, list, install + progress, remove — против Ollama
5. Сценарии catalog прошли: get / search / getModelInfo (unknown → `null`, не фатальный 404)
6. Баги контракта TS ↔ Rust JSON/SSE зафиксированы и выровнены точечными фиксами только по падениям; новых use-cases / новых path вне карты MVP / SSE→WS нет
7. Существует `ACCEPTANCE.md` в каталоге change со статусом каждой обязательной строки; нет обязательных RAG/PDF
8. Регрессия: при правках Rust — `cargo test -p underlator-core` (включая architecture lint) и `cargo test -p underlator-server` код 0; при правках React — `npm run type:check` и unit-тесты клиента код 0
9. **Не** сделаны: атом 5.x (Tauri host commands), выпил Electron / `ElectronTransport`, переписывание `BackendClient`, multi-user IAM, RAG/splash runtime, рефакторинг UI/FSD вне дыр приёмки
10. Все чекбоксы в этом `tasks.md` отмечены `[x]`

## Out of scope (явно не делать)

- Атом 5.x (Tauri commands/events, app data dir, wiring desktop)
- Выпил `electron-app` и `ElectronTransport`
- Новые use-cases MVP в `underlator-core` «с нуля»
- Переписывание `BackendClient` / смена SSE → WebSocket
- Полная multi-user IAM / Open WebUI-like auth
- RAG / PDF / splash runtime как требования приёмки
- Рефакторинг UI/FSD и косметика вне дыр, из-за которых сценарий падает
- Playwright/CI E2E как обязательный gate этого атома
