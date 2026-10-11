# Proposal

## Why

После закрытых атомов 6.1 (RAG), 6.2 (splash) и 6.3 (Ollama + видимый `url` + manage models) открытие settings, длинные popup-списки и chat всё ещё просаживают кадры: тяжёлый список моделей живёт внутри settings, каталог с `forceRefresh` привязан к открытию manage-models, а текущий lazy в popup и полный `.map` чатов/сообщений коммитят дерево в один кадр. Атом **6.4** убирает этот jank узкими правками React UX до выпила Electron (7.1), с ручной приёмкой после каждой из трёх оптимизаций.

## What Changes

- **Оптимизация 1 — settings:** открытие `react-app/src/widgets/settings` MUST NOT тянуть каталог / installed models и MUST NOT монтировать тяжёлый список manage-models, пока пользователь не открыл «manage models». Повторный заход в settings MUST NOT делать тяжёлый sync, если кэш для текущего provider id + `url` ещё годен. Контракт 6.3 (провайдер `Ollama`, видимый `url`, manage models по url + provider id) сохраняется.
- **Оптимизация 2 — popup:** `react-app/src/shared/ui/popup` (`popup.tsx`, `lazy-list-item.tsx`, путь через `popup-with-search`) не коммитит весь каталог в один кадр. Тяжёлый контент монтируется после анимации открытия (0.28s transition), затем раскрывается порциями. Общий хук progressive reveal выносится так, чтобы его переиспользовал chat.
- **Оптимизация 3 — chat:** тот же хук применяется к списку чатов в sidebar и к хвосту истории сообщений. Persist/CRUD MVP chat через `BackendClient` не меняется.
- Apply идёт строго 1 → ручной confirm → 2 → ручной confirm → 3 → ручной confirm. Три оптимизации одним комком запрещены. DoD атома — только после трёх подтверждений пользователя; чекбокс «пользователь подтвердил N» агент не отмечает сам.
- **Не** делать: 7.1 (удаление Electron / `ElectronTransport` / `electron-app`); возврат RAG/splash UI и снятие `TODO(rag)` / `TODO(splash)`; возврат Embedded Ollama / ollama-manager; полные адаптеры OpenRouter/Claude; широкий FSD-рефакторинг и переписывание settings / `BackendClient`; правки `underlator-core` / Tauri / server, если jank чинится на фронте.

## Capabilities

### New Capabilities

- `react-ux-perf`: отложенная загрузка каталога и списка моделей до клика «manage models»; кэш без тяжёлого sync на каждый заход в settings; общий progressive reveal для popup и chat; ручные checkpoint’ы трёх оптимизаций. Контракт 6.3 (url + provider id) остаётся обязательным для тех запросов, которые всё же уходят.

### Modified Capabilities

- _(нет)_ — требования `provider-settings-ui`, `react-backend-client`, `rag-ui-conservation` и `splash-ui-conservation` не переписываются. Момент fetch и плавность UI — новая capability; url/provider id, chat CRUD через `BackendClient` и консервация RAG/splash остаются как есть.

## Impact

- Frontend: `react-app/src/widgets/settings` (`settings.tsx`, `manage-models.tsx`, thunk `fetchCatalog` в `models/model-ipc-slice.ts`), `react-app/src/shared/ui/popup` (`popup.tsx`, `lazy-list-item.tsx`) и `popup-with-search`, новый хук в `react-app/src/shared/lib/hooks`, `react-app/src/widgets/chat/ui` (`chat.tsx`, `chat-sidebar.tsx`, `chat-messages.tsx`).
- Поведение, которое нельзя сломать: API configuration 6.3; `fetchCatalog` / install / remove по-прежнему через `BackendClient` с `id`/`url` из settings; chat `list` / `create` / `get` / `update` / `delete` / `addMessage` через `BackendClient`.
- Rust core, Tauri host, server — вне скоупа, пока фронтовый jank не потребует контрактной дыры (не ожидается).
- Приёмка: три ручных UI-checkpoint’а, не автоматический E2E.
