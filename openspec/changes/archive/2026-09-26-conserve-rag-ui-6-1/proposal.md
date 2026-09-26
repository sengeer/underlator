# Proposal

## Why

После закрытого атома 5.2 desktop Tauri уже отдаёт рабочий MVP `model` / `catalog` / `chat`, но в `react-app` остаются живые RAG-точки входа (attach file, RAG configuration, manage embedding models, `ragIpc` / `loadRagContext`), которых нет в rust-core. Пользователь на Tauri/HTTP может вызвать отсутствующий backend. Атом 6.1 — первый шаг этапа 6: законсервировать RAG UI **до** splash (6.2), Embedded Ollama (6.3), perf (6.4) и выпила Electron (7.1).

## What Changes

- Скрыть кнопку `attach file` в `react-app/src/widgets/chat/ui/chat.tsx` (~439–443, `uploadAndProcessDocument`) — не рендерить в MVP-сборке
- Законсервировать цепочку после кнопки: handlers upload/process, вызовы `rag.*` / `ragIpc`, toast/progress UX в чате — **не** удалять файлы, а отключить входные точки (comment-out / early-return / feature-flag) с маркерами `// TODO(rag): ...`
- Скрыть секцию **RAG configuration** в `react-app/src/widgets/settings/ui/settings.tsx` (~478–546: topK, similarity threshold, chunk size, manage embedding models) — comment-out + `// TODO(rag): restore RAG settings when rust-core RAG lands`
- Законсервировать связанные попапы/слайсы embedding models (`ManageModels mode='rag'`, `manageEmbeddingModelsPopup`, ветки `target: 'rag'`) — никаких «живых» кликов в отсутствующий RAG backend; те же `TODO(rag)`
- Отключить/законсервировать вторичные входные точки той же цепочки в MVP-пути: `loadRagContext` / chat feature-provider, best-effort `ragIpc` при delete chat, dev-кнопки RAG в settings tests — без удаления модулей `shared/apis/rag-ipc` и связанных типов
- Режимы chat / translation / instruction **без документов** продолжают работать через `BackendClient` (Tauri/HTTP)
- Опереться на закрытый 5.2; порядок этапа: **6.1 → 6.2 → 6.3 → 6.4 → 7.1**
- **Не** делать: реализацию RAG в rust-core; удаление Electron / `ElectronTransport` / `electron-app` (7.1); splash / Embedded Ollama / API configuration rewrite (6.2 / 6.3); perf / lazy loading (6.4); широкий рефакторинг FSD вне нужного для скрытия/консервации

## Capabilities

### New Capabilities

- `rag-ui-conservation`: консервация RAG UI для MVP без rust-core RAG — скрытие attach file и RAG settings, отключение входных точек `rag.*` / embedding-models с маркерами `TODO(rag)`, сохранение кода как заготовок; MVP chat/settings без документов стабильны через `BackendClient`

### Modified Capabilities

- `react-backend-client`: уточнение — поверхности `rag.*` MAY оставаться в коде как законсервированные заготовки с `TODO(rag)`, но MVP product UI MUST NOT рендерить и MUST NOT вызывать живые RAG-действия; wiring MVP `model` / `catalog` / `chat` через `BackendClient` MUST остаться без регрессий

## Impact

- Код: в основном `react-app` — `widgets/chat/ui/chat.tsx`, `widgets/chat/ui/chat-sidebar.tsx`, `widgets/settings/ui/settings.tsx`, `widgets/settings/ui/manage-embedded-ollama.tsx` (режим `rag`), `shared/lib/utils/chat-handlers/chat-rag-loader.ts`, возможно `feature-provider` / settings tests UI; Redux/popups для embedding models
- Модули `shared/apis/rag-ipc`, типы RAG, константы embedding — **сохраняются** (не удалять подчистую)
- `BackendClient`, Tauri/HTTP hosts, `underlator-core` — без реализации RAG и без смены MVP DTO
- Electron остаётся до 7.1; splash / Embedded Ollama / perf — следующие атомы 6.x
- Маркер поиска заготовок: `TODO(rag)` (`rg 'TODO\(rag\)'`)
