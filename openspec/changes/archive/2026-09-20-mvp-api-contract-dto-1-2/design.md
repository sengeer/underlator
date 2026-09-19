# Design

## Context

См. `proposal.md` (Why). Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §1.2.  
Каркас 1.1 уже дал `crates/underlator-core` (`error`, `http` stub, `ScaffoldInfo`). Публичный контракт сейчас только в `electron-app/src/preload.ts` и типах `electron-app/src/types/{ollama,catalog,chat,models,electron,preload,ipc-handlers}.ts`.  
Наблюдение: IPC handlers возвращают **доменный payload**, а `IpcHandler.createHandlerWrapper` оборачивает его в `IpcResponse<T>` (`success`/`data`/`error`/`id`). Progress-события (`model:generate-progress`, `model:install-progress`) шлются **сырым chunk**, без этой обёртки.

## Goals / Non-Goals

**Goals:**

- Один набор serde-DTO в core, совпадающий по смыслу и JSON-ключам с TS-типами preload
- Единая модель progress-событий, независимая от IPC/WS/SSE/Tauri
- Компилируемая карта имён IPC → use-case → HTTP path (черновик) + Tauri command
- Roundtrip-тесты на `serde_json` без сети и без host-фреймворков

**Non-Goals:**

- Функции use-case (`generate_stream`, CRUD чата, catalog fetch)
- Реализация `HttpClient` (атом 2.1) и `LlmProvider`/Ollama (атом 2.2)
- Axum routes, Tauri commands, React `BackendClient`
- DTO для RAG, splash, embeddings, `updateTranslations`, `openMail`
- Выравнивание расхождений preload-типов vs фактический handler return через правки Electron

## Decisions

1. **Доменный payload, не `IpcResponse`**  
   Core хранит типы запросов/ответов/событий (`GenerateRequest`, `ChatData`, `ModelCatalog`, …). Обёртка `{ success, data, error, id }` — деталь Electron transport; будущие hosts сделают свою (HTTP status, Tauri `Result`).  
   *Альтернатива:* тащить `IpcResponse` в core — привяжет dual-mode к Electron envelope. Отклонено.

2. **Фактический payload handlers, а не всегда `ElectronAPI` Promise-generics**  
   `preload.ts` `ElectronAPI` иногда врёт (`chat.create` → `CreateChatResult`, `model.list` → `any`). Реальный `data` после wrapper:  
   - `model.generate` → `string`  
   - `model.install` / `model.remove` → `{ success: boolean }`  
   - `model.list` → `{ models: OllamaModel[] }`  
   - `model.stop` → пусто  
   - `catalog.get` / `search` → `ModelCatalog`  
   - `catalog.getModelInfo` → `OllamaModelInfo | null`  
   - `chat.create|get|update` → `ChatData`  
   - `chat.delete` → `{ deletedChatId }`  
   - `chat.list` → `{ chats, totalCount, pagination }`  
   - `chat.addMessage` → `{ message, updatedChat }`  
   DTO ответы в core зеркалят **это**. Типы `ChatOperationResult` / `OllamaOperationResult` в core не дублируем: это сервисный envelope Node-слоя.

3. **JSON-ключи как в TypeScript; Rust-поля snake_case**  
   Смешанный стиль источника: Ollama generate/list — `max_tokens`, `created_at`; chat/catalog/config — `chatId`, `forceRefresh`, `displayName`.  
   Реализация: `#[serde(rename = "...")]` / точечный `rename_all` **на тип**, не crate-wide `camelCase`.  
   `Record<string, unknown>` → `serde_json::Value` / `Map<String, Value>`.  
   Index signature у generate chunk → `#[serde(flatten)] extra: Map<String, Value>`.  
   *Альтернатива:* всё в snake_case в JSON — сломает будущий `BackendClient` паритет с текущим UI. Отклонено.

4. **Раскладка модулей по доменам плана, DTO без поведения**  
   ```text
   crates/underlator-core/src/
     contract.rs      # naming map (константы + таблица операций)
     events.rs        # GenerateProgress / InstallProgress / CoreEvent
     model/mod.rs     # pub mod dto; без generate/stop функций
     model/dto.rs
     catalog/mod.rs + dto.rs
     chat/mod.rs + dto.rs
     rag.rs           # placeholder, без DTO
     splash.rs        # placeholder, без DTO
   ```  
   Позже атом 2.3 добавит use-cases в те же `model`/`catalog`/`chat`, не переезжая типы.  
   *Альтернатива:* отдельный crate `underlator-api` — лишний member вне плана. Отклонено.

5. **Naming map — данные в core, не markdown-only**  
   Структура вроде `ContractOp { ipc, use_case, http_method, http_path, tauri_command }` плюс `ContractEvent { ipc_event, core_name }`. Черновик путей (смысл операций менять нельзя; строки путей атом 3.1 может уточнить, не ломая use-case id):

   | IPC | use-case | HTTP (черновик) | Tauri (черновик) |
   |-----|----------|-----------------|------------------|
   | `model:generate` | `model::generate_stream` | `POST /api/model/generate` | `model_generate` |
   | `model:stop` | `model::stop` | `POST /api/model/stop` | `model_stop` |
   | `model:install` | `model::install` | `POST /api/model/install` | `model_install` |
   | `model:remove` | `model::remove` | `POST /api/model/remove` | `model_remove` |
   | `model:list` | `model::list` | `GET /api/model/list` | `model_list` |
   | `catalog:get` | `catalog::get` | `GET /api/catalog` | `catalog_get` |
   | `catalog:search` | `catalog::search` | `POST /api/catalog/search` | `catalog_search` |
   | `catalog:get-model-info` | `catalog::get_model_info` | `GET /api/catalog/models/:name` | `catalog_get_model_info` |
   | `chat:create` | `chat::create` | `POST /api/chat` | `chat_create` |
   | `chat:get` | `chat::get` | `GET /api/chat/:id` | `chat_get` |
   | `chat:update` | `chat::update` | `PATCH /api/chat/:id` | `chat_update` |
   | `chat:delete` | `chat::delete` | `DELETE /api/chat/:id` | `chat_delete` |
   | `chat:list` | `chat::list` | `GET /api/chat` | `chat_list` |
   | `chat:add-message` | `chat::add_message` | `POST /api/chat/:id/messages` | `chat_add_message` |

   События: `model:generate-progress` → `events::generate_progress`; `model:install-progress` → `events::install_progress`.  
   Тест: полный набор IPC имён из preload MVP присутствует ровно один раз.

6. **События — enum + стабильные строковые имена**  
   `CoreEvent::GenerateProgress(GenerateProgress)` / `InstallProgress(...)`. Строка имени — константа для host emit (Tauri event / WS type). Core не знает, как доставить событие.

7. **Placeholders RAG/splash**  
   Пустые модули с rustdoc «вне MVP, DTO появятся после этапа 6.2 / splash — desktop-only». Без `pub struct`. Не раздувать `lib.rs` фейковыми типами.

8. **Тесты и стоимость**  
   Unit-тесты `serde_json::to_value` / `from_value` на фикстурах с точными ключами. Без IO. Не клонировать лишние `String` в тестах сверх фикстуры. `#![warn(missing_docs)]` уже включён — каждый `pub` item с rustdoc на русском.

9. **Граница ошибок**  
   Новый сериализуемый error-DTO не вводим: `CoreError` остаётся `thiserror` для каркаса. Маппинг ошибок в HTTP/Tauri — атомы host. Невалидный JSON ловится на границе host (`serde` error), не use-case.

## Risks / Trade-offs

- **Расхождение `ElectronAPI` vs handler `data`** → Mitigation: в rustdoc и `design` явно зафиксирован handler payload; React уже читает `IpcResponse.data` или сырой chunk.
- **Ollama-имена в generate DTO (`max_tokens`)** → Mitigation: для MVP это и есть текущий контракт UI; provider-абстракция (2.2) мапит vendor JSON ↔ эти DTO, не наоборот.
- **Черновик HTTP path в core** → Mitigation: use-case id стабилен; атом 3.1 может сменить path-строку, не меняя DTO и смысл операции.
- **`Value` для metadata** → Mitigation: гибкость как в TS; строгая схема metadata — не MVP.
- **Соблазн сразу писать use-cases** → Mitigation: DoD запрещает функции генерации/хранения; review по `tasks.md`.

## Migration Plan

- Только аддитивно внутри `underlator-core`. Rollback = revert коммита атома.
- Electron/React не мигрируют в этом change.
- Следующее потребление: атом 2.3 (use-cases принимают эти типы), 3.1/5.1 (host adapters).

## Open Questions

Нет. Уточнение точных HTTP path — зона атома 3.1, не блокирует DTO и карту use-case id.
