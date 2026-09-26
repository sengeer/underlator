# Tasks

## 1. Chat: скрыть attach file и законсервировать upload chain

- [x] 1.1 В `react-app/src/widgets/chat/ui/chat.tsx` убрать из render кнопку `attach file` (`TextAndIconButton` / `uploadAndProcessDocument`, ~439–443) так, чтобы она не появлялась в MVP UI; проверить отсутствием кнопки в дереве (не CSS `display: none`)
- [x] 1.2 Законсервировать handler `uploadAndProcessDocument` и связанный toast/progress UX (comment-out / early-return / flag) с маркером `// TODO(rag): ...`; проверить, что файлы не удалены и маркер есть у входной точки
- [x] 1.3 Убедиться, что импорт/`ragIpc` в chat не оставляет других живых вызовов upload/process из UI чата; проверить `rg 'ragIpc|uploadAndProcess' react-app/src/widgets/chat`

## 2. Settings: скрыть RAG configuration и embedding popup

- [x] 2.1 В `react-app/src/widgets/settings/ui/settings.tsx` законсервировать секцию **RAG configuration** (~478–546: topK, similarity threshold, chunk size, manage embedding models) comment-out + `// TODO(rag): restore RAG settings when rust-core RAG lands`; проверить, что секция не видна в settings UI
- [x] 2.2 Законсервировать `<ManageModels mode='rag' …>` / `manageEmbeddingModelsPopup` так, чтобы popup embedding models был недостижим из settings; проверить отсутствие живого клика `openElement('manageEmbeddingModelsPopup')` в активном JSX
- [x] 2.3 Пройти ветки `mode === 'rag'` / `target: 'rag'` в `manage-embedded-ollama.tsx` (и связанные slice-вызовы): отключить достижимые install/remove embedding для RAG с `TODO(rag)`; проверить, что видимый UI не запускает эти ветки

## 3. Вторичные RAG call sites на MVP-пути

- [x] 3.1 Законсервировать `loadRagContext` (`chat-rag-loader.ts` / вызов из `feature-provider`) как no-op / early-return с `TODO(rag)`, чтобы generate чата не требовал `rag.*`; проверить, что chat generate без документов идёт через `BackendClient.model`
- [x] 3.2 В `chat-sidebar.tsx` отключить вызов `ragIpc.deleteDocumentCollection` (comment-out / early-return + `TODO(rag)`), сохранив `deleteChat` через BackendClient; проверить, что delete чата не блокируется отсутствием RAG
- [x] 3.3 Законсервировать dev/test UI кнопки RAG в settings (`widgets/settings/ui/tests.tsx` и связанные), чтобы ручной клик не бил в отсутствующий backend; файлы `tests/rag-ipc.ts` / `shared/apis/rag-ipc` **не** удалять — пометить `TODO(rag)` при необходимости; проверить отсутствие видимых RAG-test действий в MVP settings path

## 4. Регрессия MVP без документов и scope guards

- [x] 4.1 Ручной smoke (Tauri и/или HTTP): chat send/receive, translation, instruction без документов — всё через `BackendClient`; проверить успех без toast/ошибок RAG
- [x] 4.2 Ручной smoke settings: открытие settings без секции RAG; CRUD chat (create/list/delete) без требования RAG; проверить отсутствие доступных RAG-действий в UI
- [x] 4.3 Скан scope: нет реализации RAG в rust-core; нет удаления Electron / `ElectronTransport` / `electron-app`; нет правок splash / Embedded Ollama / API configuration rewrite / perf lazy (6.2–6.4 / 7.1); нет широкого FSD-рефакторинга вне консервации; проверить `git diff` / review
- [x] 4.4 Выполнить `rg 'TODO\(rag\)'` по репозиторию и убедиться, что находятся заготовки как минимум у chat attach/upload, RAG settings и embedding-models входных точек; модули `rag-ipc` на месте

## Definition of Done (DoD)

Change `conserve-rag-ui-6-1` считается выполненным **только если** все пункты ниже истинны:

1. **В UI нет доступных RAG-действий:** нет кнопки attach file в чате; нет секции RAG configuration в settings; нет достижимого manage embedding models / install-remove `target: 'rag'` из product UI; нет живых dev RAG-кнопок на MVP-пути
2. **`rg 'TODO\(rag\)'`** находит заготовки консервации (chat attach/upload, RAG settings, embedding popup/ветки и вторичные call sites, которые отключали)
3. **MVP chat / settings без документов не ломаются:** chat generate, translation, instruction и chat CRUD (включая delete) работают через `BackendClient` (Tauri и/или HTTP) без обязательного `rag.*`
4. Код RAG (`shared/apis/rag-ipc`, типы, константы) **не** удалён подчистую — только входные точки отключены
5. **Вне скоупа не сделано:** RAG в rust-core; выпил Electron (7.1); splash (6.2); Embedded Ollama / API configuration rewrite (6.3); perf / lazy (6.4); широкий FSD-рефакторинг
6. Порядок этапа сохранён: после 6.1 следующий атом — **6.2**, не 7.1
