# Spec Delta

## MODIFIED Requirements

### Requirement: Existing generate and chat call sites use BackendClient
`feature-provider`, хук `use-model` (включая `stop`) и chat API слой (`shared/apis/chat-ipc` и клиент catalog/model, которым пользуется settings) SHALL выполнять MVP-операции только через `BackendClient`. Они MUST NOT обращаться к `window.electron.model|catalog|chat` напрямую. Код поверхностей `rag.*` и `splash.*` MAY оставаться в репозитории как заготовки; после атома 6.1 живые вызовы `rag.*` из MVP product UI MUST NOT выполняться (входные точки законсервированы с `TODO(rag)` согласно capability `rag-ui-conservation`). Поверхность `splash.*` MAY оставаться на Electron IPC до атома 6.2. Совместимые обёртки результатов чата (`success` / `error` для Redux) MAY сохраняться над `BackendClient`, но MUST не обходить его.

#### Scenario: Feature provider generate goes through the client
- **WHEN** выполняется чат, инструкция, простой или контекстный перевод через `feature-provider`
- **THEN** `generate` и подписка на прогресс MUST идти через `BackendClient.model`
- **AND** исходники этих обработчиков MUST NOT содержать `window.electron.model`

#### Scenario: Use-model stop goes through the client
- **WHEN** пользователь останавливает активную генерацию через `use-model`
- **THEN** MUST вызываться `BackendClient.model.stop`
- **AND** MUST NOT вызываться `window.electron.model.stop` напрямую

#### Scenario: Chat CRUD goes through the client
- **WHEN** slice или виджет создаёт, читает, обновляет, удаляет чат или добавляет сообщение
- **THEN** сеть/IPC MUST выполняться через `BackendClient.chat` (напрямую или через тонкую обёртку chat API)
- **AND** обёртка MUST NOT вызывать `window.electron.chat` в обход клиента

#### Scenario: MVP UI does not invoke live rag surfaces
- **WHEN** пользователь работает в MVP UI на Tauri или HTTP после атома 6.1
- **THEN** видимые действия MUST NOT инициировать живые вызовы `rag.*` / `ragIpc` upload/process/query
- **AND** код `rag.*` MAY оставаться в репозитории с маркерами `TODO(rag)`
