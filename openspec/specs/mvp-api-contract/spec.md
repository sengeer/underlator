# mvp-api-contract Specification

## Purpose
Фиксирует в `underlator-core` типизированный MVP-контракт `model` / `catalog` / `chat` (запросы, ответы и progress-события) как общее зеркало текущего Electron preload, чтобы оба будущих host и React `BackendClient` использовали одни payload'ы и одну карту имён.

## Requirements

### Requirement: Model contract types mirror preload
The core library SHALL expose serializable request and response types whose meaning matches the Electron preload `model` surface: `generate` (request + provider config), `stop`, `install`, `remove`, and `list`.

#### Scenario: Generate request and unary result
- **WHEN** a host serializes a generate call
- **THEN** the payload MUST include required fields `model` and `prompt`, optional generation fields equivalent to the current Ollama generate request (`system`, `temperature`, `max_tokens`, `num_predict`, `think`, `context`), and the provider config fields `id` and `url`
- **AND** the unary completion payload MUST be the concatenated generated text (string), equivalent to the current invoke result data

#### Scenario: Install, remove, list, and stop payloads
- **WHEN** a host serializes install, remove, list, or stop
- **THEN** install MUST use a request with required `name` and optional `tag`, `registry`, `insecure`
- **AND** remove MUST use a request with required `name`
- **AND** list MUST have an empty request body and a response with a `models` array whose items include `name`, `size`, and `modified_at`
- **AND** stop MUST have an empty request body
- **AND** install and remove unary results MUST include a boolean `success` field

### Requirement: Catalog contract types mirror preload
The core library SHALL expose serializable types whose meaning matches the Electron preload `catalog` surface: `get`, `search`, and `getModelInfo`.

#### Scenario: Get and search return a catalog snapshot
- **WHEN** a host serializes `catalog.get` or `catalog.search`
- **THEN** `get` MUST accept optional `forceRefresh`
- **AND** `search` MUST accept the current catalog filter fields (including `search`, `type`, `localStatus`, size bounds, `category`, `tags`, `languages`, `architecture`, `format`, `license`, `author`, `minRating`, `minDownloads`, `recommendedOnly`, `availableOnly`, `sortBy`, `sortOrder`, `limit`, `offset`)
- **AND** both operations MUST share a catalog snapshot payload with `ollama` (array of model cards), `totalCount`, and `lastUpdated`

#### Scenario: Model card and getModelInfo
- **WHEN** a host serializes `catalog.getModelInfo` or a catalog model card
- **THEN** the lookup request MUST include `modelName`
- **AND** the model card MUST carry the current fields (`id`, `name`, `displayName`, `size`, `createdAt`, `modifiedAt`, `type` equal to `ollama`, `format`, `parameterSize`, `quantizationLevel`, plus optional description/version/digest/tags/compatibility)
- **AND** `getModelInfo` MUST allow a null result when the model is not found

### Requirement: Chat contract types mirror preload
The core library SHALL expose serializable types whose meaning matches the Electron preload `chat` surface: `create`, `get`, `update`, `delete`, `list`, and `addMessage`.

#### Scenario: Chat entity and message
- **WHEN** a host serializes a chat or a message
- **THEN** a chat MUST include `id`, `title`, `messages`, `createdAt`, `updatedAt`, and `defaultModel`
- **AND** a message MUST include `id`, `role` (`user` | `assistant` | `system`), `content`, and `timestamp`
- **AND** optional nested objects (`model`, `context`, `metadata`, generation settings) MUST preserve the current meaning

#### Scenario: Chat operation payloads
- **WHEN** a host serializes chat CRUD and `addMessage`
- **THEN** create MUST accept `title` and `defaultModel` (plus optional `systemPrompt`, `generationSettings`, `metadata`) and return a full chat
- **AND** get MUST accept `chatId` with optional `includeMessages`, `messageLimit`, `messageOffset` and return a full chat
- **AND** update MUST accept `chatId` with optional patch fields and return a full chat
- **AND** delete MUST accept `chatId` with optional `createBackup` and `confirmed`, and return `deletedChatId`
- **AND** list MUST accept the current list filters and return `chats` (list items without full message history), `totalCount`, and `pagination`
- **AND** addMessage MUST accept `chatId`, `role`, and `content` (plus optional `model`, `context`, `metadata`) and return the new `message` together with `updatedChat`

### Requirement: Unified progress event model
The core library SHALL define a single event model for streaming progress that covers Electron events `model:generate-progress` and `model:install-progress`, without embedding host transport (IPC, WebSocket, SSE, or Tauri emit).

#### Scenario: Generate progress event
- **WHEN** a generate stream emits a chunk
- **THEN** the event identity MUST correspond to `model:generate-progress`
- **AND** the payload MUST include `model`, `response`, `created_at`, and `done`, with optional duration/token/context fields equivalent to the current generate stream chunk

#### Scenario: Install progress event
- **WHEN** a model install emits progress
- **THEN** the event identity MUST correspond to `model:install-progress`
- **AND** the payload MUST include `status` (`downloading` | `verifying` | `writing` | `complete`), `name`, and optional `size`, `total`, `digest`, `error`

### Requirement: JSON field names stay compatible with existing TypeScript types
Serialized JSON for MVP contract types MUST use the same field names as the current TypeScript sources under `electron-app/src/types/` (mixed camelCase and snake_case as already used). Changing field meaning is forbidden; this change MUST NOT require React to rename keys.

#### Scenario: Roundtrip keeps TypeScript key names
- **WHEN** a representative payload is serialized to JSON and deserialized back
- **THEN** required keys such as `max_tokens`, `created_at`, `chatId`, `forceRefresh`, `displayName`, and `totalCount` MUST appear with those exact names
- **AND** the deserialized value MUST equal the original for those fields

### Requirement: Naming map from IPC to use-case to HTTP path
The core library SHALL publish a naming map covering every MVP preload operation: Electron IPC name → core use-case identifier → future HTTP path (and a draft Tauri command name). The map MUST NOT invent new operations and MUST NOT include `rag.*` or `splash.*`.

#### Scenario: Complete MVP operation coverage
- **WHEN** a developer inspects the naming map
- **THEN** it MUST contain entries for `model:generate`, `model:stop`, `model:install`, `model:remove`, `model:list`, `catalog:get`, `catalog:search`, `catalog:get-model-info`, `chat:create`, `chat:get`, `chat:update`, `chat:delete`, `chat:list`, and `chat:add-message`
- **AND** it MUST record event names `model:generate-progress` and `model:install-progress`
- **AND** HTTP paths MUST live under `/api/model`, `/api/catalog`, and `/api/chat` as drafted in the dual-mode architectural plan
- **AND** the map MUST be queryable in tests (each IPC name resolves to exactly one use-case identifier)

### Requirement: Serialization works for both future hosts
All MVP contract types and progress event payloads SHALL be JSON-serializable and JSON-deserializable so that both the desktop host and the server host can reuse the same types. The core library MUST NOT depend on `tauri` or `axum` to define or serialize this contract.

#### Scenario: Host-agnostic JSON
- **WHEN** `crates/underlator-core` is inspected and a contract payload is encoded as JSON
- **THEN** core dependencies MUST NOT include `tauri` or `axum`
- **AND** the JSON MUST be usable without a host-specific wrapper type inside core
- **AND** the Electron `IpcResponse` envelope (`success` / `data` / `error` / `id`) MUST NOT be required as part of the core contract (hosts wrap or unwrap at the edge)

### Requirement: RAG and splash stay outside the MVP contract
The MVP contract MUST NOT include RAG or splash DTO. Placeholder modules MAY exist, but they MUST NOT export request/response types for those surfaces in this change.

#### Scenario: No RAG or splash payloads
- **WHEN** the public MVP contract surface of core is inspected
- **THEN** there are no serializable RAG or splash request/response types
- **AND** `rag.*` / `splash.*` IPC names are absent from the naming map

### Requirement: Contract change does not implement use-cases or other hosts
Типы запросов, ответов и progress-событий MVP SHALL оставаться payload-контрактом исполняемых use-cases `model` / `catalog` / `chat`. Use-cases MUST принимать и возвращать эти типы без переименования JSON-ключей. Этот атом MUST NOT добавлять Axum routes, Tauri commands или React `BackendClient`; обёртка транспорта по-прежнему на стороне host.

#### Scenario: Types without runtime behavior
- **WHEN** выполняется generate, `catalog.get` или `chat.create`
- **THEN** вход и выход MUST использовать существующие contract DTO (смысл полей и JSON-ключи без переименования)
- **AND** `electron-app/` and `react-app/` remain unmodified as a requirement of this change
- **AND** `underlator-server` and `underlator-tauri` do not gain HTTP routes or Tauri commands for the MVP API from this change
