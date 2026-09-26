# Design

## Context

См. `proposal.md` (Why) и delta-спеки `rag-ui-conservation`, `react-backend-client`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §6.1. Gate: закрытый 5.2; дальше по плану только 6.2 → 6.3 → 6.4 → 7.1.

Наблюдение (код, не план):

- `chat.tsx`: кнопка `attach file` (~439–443) → `uploadAndProcessDocument()` → `ragIpc.uploadAndProcessDocument` + toast/progress; импорт `ragIpc`
- `settings.tsx`: секция **RAG configuration** (~478–546) + `ManageModels mode='rag'` (~603–608) через `manageEmbeddingModelsPopup`
- `manage-embedded-ollama.tsx`: ветки `mode === 'rag'` / `target: 'rag'` для install/remove embedding
- `chat-rag-loader.ts` + `feature-provider`: `loadRagContext` уже no-op без `window.electron.rag` (4.2), но на Electron-пути ещё живой
- `chat-sidebar.tsx`: best-effort `ragIpc.deleteDocumentCollection` перед `deleteChat`
- `shared/apis/rag-ipc`, settings `tests/rag-ipc.ts` / UI tests — Electron-only поверхность; `BackendClient` RAG не содержит (контракт 4.1)

## Goals / Non-Goals

**Goals:**

- Убрать все пользовательски достижимые RAG-действия из MVP UI
- Сохранить код как заготовки с единым маркером `TODO(rag)`
- Не сломать chat / translation / instruction без документов на Tauri/HTTP через `BackendClient`
- Минимальный diff: comment-out / early-return / простой flag, без широкого FSD-рефакторинга

**Non-Goals:**

- RAG в rust-core / hosts / `BackendClient.rag`
- Удаление Electron / `ElectronTransport` / `electron-app` (7.1)
- Splash UI (6.2), Embedded Ollama / API configuration rewrite (6.3), perf / lazy (6.4)
- Удаление модулей `rag-ipc`, типов, констант, Redux-полей `rag` «подчистую»
- Переписывание i18n-строк RAG (достаточно скрыть UI)

## Decisions

1. **Консервация входных точек, не удаление модулей**  
   Предпочтение плана: comment-out JSX/handlers + `// TODO(rag): ...`, либо early-return в начале функции, либо один локальный флаг `const RAG_UI_ENABLED = false` рядом с точкой входа. Модули `shared/apis/rag-ipc`, типы, slice-поля `rag` остаются.  
   *Альтернатива:* вырезать файлы RAG — ломает будущий возврат и противоречит §6.1. Отклонено.  
   *Альтернатива:* Vite `import.meta.env.VITE_ENABLE_RAG` на весь бандл — полезно позже, но избыточно для одного атома; допустим простой `false`-флаг в файле, если удобнее JSX. Не блокирует DoD.

2. **Chat: скрыть кнопку + отключить handler**  
   В `chat.tsx` не рендерить блок `TextAndIconButton` attach file; `uploadAndProcessDocument` — comment-out или early-return с `TODO(rag)` (не оставлять «мёртвый» onClick на скрытой кнопке как единственную меру: кнопку убрать из дерева). Toast/progress, завязанные только на upload, консервируются вместе с handler.  
   *Альтернатива:* `display: none` CSS — кнопка остаётся в a11y/DOM. Отклонено.

3. **Settings: comment-out секции RAG + popup embedding**  
   Закомментировать h2 + Grid RAG configuration (~478–546) и `<ManageModels mode='rag' …>` с `TODO(rag): restore when rust-core RAG lands`. Redux `updateRagSettings` / form fields для topK и т.д. можно оставить в form state (не вредят, если UI не пишет) или тоже ограничить watch-веткой — достаточно, чтобы UI не открывал popup и не слал install/remove `target: 'rag'`.  
   *Альтернатива:* удалить `rag` из `provider-settings-slice` — шире скоупа, риск localStorage. Отклонено для 6.1.

4. **Вторичные call sites на MVP-пути**  
   - `loadRagContext`: усилить до безусловного no-op с `TODO(rag)` (или оставить detect Electron, но пометить TODO и не полагаться на Electron RAG в dual-mode MVP) — generate чата не должен ходить в rag IPC.  
   - `chat-sidebar` delete collection: early-return / comment-out вызова с `TODO(rag)`; `deleteChat` через BackendClient остаётся.  
   - Dev UI RAG tests в settings: скрыть/законсервировать кнопки, чтобы ручной клик не бил в отсутствующий backend.  
   *Альтернатива:* трогать только chat+settings видимые секции — риск оставить живые клики в tests/sidebar. Отклонено: DoD «нет доступных RAG-действий».

5. **Маркер `TODO(rag)` — канон поиска**  
   Единый префикс `TODO(rag)` (допустим текст после `: `). DoD: `rg 'TODO\(rag\)'` находит заготовки у chat attach, settings RAG, embedding popup/ветки. Не путать с будущими `TODO(splash)`.

6. **Без изменений rust-core / hosts**  
   Этот атом — только `react-app` (и при необходимости точечные тесты UI/wiring). Arch-lint / `cargo test -p underlator-core` не являются gate этого frontend-атома, кроме случая случайной правки core (её быть не должно).

## Risks / Trade-offs

- [Скрыли UI, но handler всё ещё callable из hot-reload/debug] → парно отключать render **и** вход handler/early-return; пройти grep по `ragIpc.` / `uploadAndProcess` / `mode='rag'`
- [Electron-режим потеряет RAG раньше 7.1] → осознанный trade-off этапа 6: dual-mode UI выровнен под rust-core MVP; код сохраняется с TODO
- [Redux `rag` / localStorage остаются] → допустимо; 6.3 может нормализовать provider, не RAG store
- [Ложные «живые» тесты settings] → законсервировать UI-кнопки RAG tests, файлы `tests/rag-ipc.ts` оставить с TODO
- [Широкий FSD-рефакторинг «заодно»] → запрещён; только точки входа

## Migration Plan

1. Законсервировать chat attach + upload chain
2. Законсервировать settings RAG section + embedding popup/ветки
3. Отключить вторичные call sites (`loadRagContext`, sidebar delete collection, dev RAG buttons)
4. Проверить `rg 'TODO\(rag\)'` и ручной smoke: chat send, translation, instruction, delete chat, settings без RAG-секции на Tauri и/или HTTP
5. Rollback: revert commit / раскомментировать блоки по `TODO(rag)` — без миграции данных

## Open Questions

Нет блокирующих: простой `const RAG_UI_ENABLED = false` vs чистый comment-out — на усмотрение implementer при apply, оба удовлетворяют спеке.
