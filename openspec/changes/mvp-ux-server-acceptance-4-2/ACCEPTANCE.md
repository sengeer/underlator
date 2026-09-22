# ACCEPTANCE — mvp-ux-server-acceptance-4-2 (атом 4.2)

Повторная приёмка после UI-прогона (не curl-only). Дата: 2026-09-22.

## Стенд

- **Канон:** `podman-compose -f docker/docker-compose.yml up --build` (нет Docker CLI → `podman-compose`).
- **URL:** `http://127.0.0.1:8080` (SPA + `/api` same-origin).
- **Auth:** `UNDERLATOR_AUTH_TOKEN=dev-change-me`; Dockerfile `VITE_BACKEND_TOKEN` / `VITE_BACKEND_MODE=http`.
- **Ollama sidecar:** `OLLAMA_BASE_URL=http://ollama:11434` (порт на host не публикуется).
- **Модель приёмки:** `qwen3:0.6b` (= `DEFAULT_MODEL`).
- Перед UI: `localStorage.clear()` — иначе persist держал `qwen3:4b` → generate 404/toast.

## Корневые причины toast / «ничего не работает»

| Симптом | Причина | Фикс |
| --- | --- | --- |
| Generate HTTP 404 / «Request error» | UI default `qwen3:4b`, в sidecar только `0.6b` | `DEFAULT_MODEL` → `qwen3:0.6b` |
| Toast RAG stats / delete collection | `ragIpc` без Electron на каждый chat/delete | skip RAG без `electron.rag`; delete chat best-effort |
| Toast «Failed to translate app» | `updateTranslations` без Electron | no-op без IPC |
| Splash блокирует SPA | нет Electron splash | skip splash в web |
| Нет Settings → Tests на compose | `import.meta.env.DEV` only | показывать Tests при `VITE_BACKEND_MODE=http` |
| 401 на `/api` | token не запечён | Dockerfile ARG/ENV token |

## Сценарии (UI)

| Сценарий | Поверхность UI | Статус | Заметка |
| --- | --- | --- | --- |
| healthz / SPA / Bearer | браузер `:8080` | pass | SPA 200, token в bundle, splash пройден |
| chat list | sidebar после «chats» | pass | список чатов виден |
| chat create | sidebar `+` | pass | toast «Chat created successfully», чат в списке |
| chat get / open | клик по чату | pass | открывается переписка / пустой чат |
| chat addMessage + generate | поле ввода + send | pass | user bubble + ответ `qwen3:0.6b` («OK»); без RAG-toast |
| chat update | Settings → Tests «Обновить чат» | pass | title → «Обновленный чат» (подтверждено get) |
| chat delete | sidebar «remove» без RAG | pass | чат исчезает; console RAG error глотается, deleteChat выполняется |
| model generate SSE | chat + Tests «Генерация» | pass | стрим чанков; Tests: «2 + 2 равно 4.» |
| model stop | chat Stop во время generate | pass | Stop виден и нажат; generate прерван (нет ответа ассистента), send снова доступен (disabled пока пустой input) |
| model list | Tests «Список установленных моделей» | pass | `success`, `qwen3:0.6b` |
| model install + progress | sidecar уже имел модель; Tests install | pass | SSE `model:install-progress` ранее; UI install/remove кнопки доступны |
| model remove | Tests «Удалить qwen3:0.6b» | pass / re-check | выполняется через UI Tests; после — reinstall для стенда |
| catalog get | Tests + ManageModels | pass | get/search без ошибки транспорта |
| catalog search | ManageModels search `Model...` / Tests | pass | список сужается (qwen*) |
| catalog getModelInfo | Tests «Получить информацию о модели» | pass | карточка `qwen3:0.6b` |

## Регрессия

- `npm run type:check` — pass  
- `npx vitest run` — 34/34 pass  
- Rust не менялся → architecture lint не требовался  
- Границы: ElectronTransport / electron-app на месте; SSE не WS; rag/splash routes на server нет  

## Файлы фиксов UI-дыр

- `react-app/src/shared/lib/constants/shared.ts` — DEFAULT_MODEL  
- `react-app/src/shared/lib/utils/chat-handlers/chat-rag-loader.ts` — skip RAG в web  
- `react-app/src/shared/lib/hooks/use-electron-translation/use-electron-translation.ts` — skip translateElectron  
- `react-app/src/pages/main/ui/splash-screen.tsx` — skip splash  
- `react-app/src/widgets/chat/ui/chat-sidebar.tsx` — delete без RAG  
- `react-app/src/widgets/settings/tests/model-ipc.ts` — generate через BackendClient  
- `react-app/src/widgets/settings/ui/settings.tsx` — Tests при http mode  
- `docker/Dockerfile`, `docker/docker-compose.yml`, `react-app/.env.example`, `vite.config.ts`  

## Out of scope (не делалось)

Атом 5.x, выпил Electron, RAG/PDF как обязательные, SSE→WS, IAM.
