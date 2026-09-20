# Design

## Context

См. `proposal.md` (Why) и delta-спеки `mvp-use-cases` / `llm-provider` / `mvp-api-contract`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §2.3.  
Наблюдение: в `underlator-core` уже есть DTO трёх доменов, `LlmProvider` + `OllamaProvider`, unified `HttpClient` и `CoreError`. Исполняемых use-cases нет — логика живёт в Electron `ModelHandlers` / `ModelCatalogService` + `ModelsApi` / `ChatHandlers` + `ChatFileSystemService`. Атом 2.4 (hex-папки + arch-lint) ещё не начат; rule разрешает прагматичную раскладку до его закрытия, но новые фичи всё равно через ports/traits.

## Goals / Non-Goals

**Goals:**

- Три сервиса use-cases в core, зависящие только от ports + DTO
- `ChatStore` / `StorageRoot` + filesystem adapter с атомарной записью `{id}.chat.json`
- Тесты на mock-портах; filesystem — на temp dir
- Классифицированные ошибки и `host_error_class` без типов host-фреймворков

**Non-Goals:**

- Переезд в `domain/` / `ports/` / `application/` / `adapters/out` (атом 2.4)
- Axum/Tauri/React, RAG, splash, OS-проба RAM/VRAM для compatibility
- Полный универсальный `FileSystemService` Electron (валидаторы всех типов файлов, locks map) — только chat store

## Decisions

1. **Прагматичная раскладка модулей, не hex 2.4**  
   ```text
   crates/underlator-core/src/
     error.rs                 # + Validation, NotFound, Storage, DeleteNotConfirmed
     host_error.rs            # HostErrorClass + host_error_class()
     model/use_cases.rs       # ModelService
     catalog/use_cases.rs     # CatalogService
     catalog/library.rs       # port CatalogLibrary + HTTP-адаптер + static fallback data
     chat/use_cases.rs        # ChatService
     chat/store.rs            # ChatStore, StorageRoot
     chat/fs_store.rs         # FilesystemChatStore
   ```  
   DTO остаются в `*/dto.rs`. Вендорный library URL — только в `catalog/library.rs`. После 2.4 эти файлы переедут в hex-слои без смены сигнатур ports.  
   *Альтернатива:* сразу hex-папки — смешает 2.3 и 2.4, ломает правило «один атом». Отклонено.

2. **Сервисы держат `Arc<dyn Port>`, один экземпляр провайдера на `ModelService`**  
   `stop` в 2.2 привязан к экземпляру `LlmProvider` (один in-flight generate). Поэтому `ModelService { provider: Arc<dyn LlmProvider> }` **не** пересобирает провайдера из `GenerateRequest.id/url` на каждый вызов — иначе stop попадёт в другой объект. Host (позже 3.x/5.x) создаёт сервис через `create_provider`. Поля `id`/`url` в DTO остаются для сериализации; тело Ollama их и так не шлёт.  
   *Альтернатива:* factory на каждый generate — ломает stop. Отклонено.

3. **Generate/install: callback прогресса + унарный результат**  
   Как Electron handler: host получает chunk (чтобы emit `model:generate-progress` / `install-progress`) и в конце `String` / `UnarySuccess`. Сигнатура в духе `generate(req, on_progress: impl FnMut(GenerateProgress)) -> Result<GenerateResult, CoreError>`. Внутри — потребление `provider.generate_stream`, конкатенация `response` в один `String` (O(сумма длин chunk), без лишних копий сверх `push_str`).  
   *Альтернатива:* отдать только `Stream` и заставить host конкатенировать — унарный контракт preload уедет из core. Отклонено.

4. **Catalog: port `CatalogLibrary` + кэш в сервисе**  
   - Локальные карточки: `provider.list_models()` → map в `OllamaModelInfo` (теги `local`/`installed`), ошибка списка → пустой vec.  
   - Библиотека: `CatalogLibrary::fetch_models()`; HTTP-адаптер через `HttpClient` на URL вроде `https://ollama-models.zwz.workers.dev` (как `ModelsApi`); ошибка → статический список (`qwen3`, порт `STATIC_MODELS`).  
   - Merge: локальные имена вытесняют библиотечные (`HashSet`, O(n)).  
   - Кэш: `Mutex<Option<(ModelCatalog, Instant)>>`, TTL 1 час как Electron; `forceRefresh` сбрасывает.  
   - search: фильтрация в памяти по полям DTO, которые есть на карточке (`search`, size, tags, type, sort, limit/offset). Поля без данных на карточке (rating/downloads/…) не отсекают карточки.  
   - getModelInfo: точное `name`, иначе `contains` как Electron; нет → `null`.  
   Compatibility RAM/VRAM **не** портируем (нужен sysinfo / host); поле оставляем пустым или `Unknown`.  
   *Альтернатива:* HTTP library прямо из use-case — нарушит границу клиента. Отклонено.

5. **`ChatStore` — persist, не дубль CRUD**  
   Port: `save(&ChatData)`, `load(id) -> ChatData`, `delete(id, backup)`, `list() -> Vec<ChatData>` (полный снимок; list-превью считает use-case). Валидация, ID, timestamps, фильтры/сортировка/пагинация, `includeMessages` / message window, `confirmed` — в `ChatService`.  
   `StorageRoot` — newtype поверх пути корня; filesystem store пишет `{root}/chats/{id}.chat.json`. Mock store — `HashMap` в `Mutex`, `StorageRoot` не нужен.  
   *Альтернатива:* методы store = create/get/update… — перенесёт бизнес-правила в адаптер, смена SQLite повторит Electron-баги. Отклонено.

6. **Ондиск-формат как Electron `ChatFileStructure`**  
   JSON: `version`, `metadata` (id/title/createdAt/updatedAt/settings), `messages[]` с `type` (= role). Конвертация в `ChatData` в адаптере store, не в use-case. Имя файла `{id}.chat.json`. Запись: temp file + `rename` (атомарно на том же volume). Backup delete: копия в `{root}/chats/backup/` до unlink.  
   *Альтернатива:* сериализовать `ChatData` as-is — проще, но несовместимо с уже лежащими Electron-файлами, когда host укажет тот же каталог. Отклонено.

7. **ID и часы как узкие зависимости сервиса, не глобали**  
   Формат как Electron: `chat_{millis}_{32hex}`, `msg_{millis}_{32hex}` (`uuid` v4 bytes или эквивалент без сети). `Clock` / generator заменяемы в тестах фиксированным временем/id. Default provider в create: `"ollama"`, если не задан. Delete без `confirmed == true` → `CoreError::DeleteNotConfirmed`, store не вызывается.

8. **Ошибки и host-маппинг**  
   Новые варианты `CoreError`: `Validation { message }`, `NotFound { entity, id }`, `DeleteNotConfirmed`, `Storage { message }` (rustdoc по-русски). HTTP/provider ошибки пробрасываются как есть.  
   `HostErrorClass { Invalid, NotFound, Cancelled, Unsupported, Provider, Storage, Http, Internal }` + `host_error_class(&CoreError) -> HostErrorClass`. Без `axum::StatusCode` / Tauri.  
   *Альтернатива:* отдельный `ChatError` enum — hosts будут матчить два типа. Отклонено.

9. **Зависимости**  
   - `uuid` (v4) для id;  
   - `tokio` feature `sync` уже тянется транзитивно; filesystem — `std::fs` внутри async fn (файлы чатов маленькие, O(size JSON)), без `tokio/fs`;  
   - `tempfile` как dev-dep для тестов filesystem store.  
   Не добавлять `sysinfo`, `axum`, `tauri`.

10. **Граница импортов и стоимость**  
    Расширить существующий архитектурный тест: `model/use_cases.rs`, `catalog/use_cases.rs`, `chat/use_cases.rs` без `reqwest`/`hyper` и без строк `/api/generate` и library URL. HTTP library — только `catalog/library.rs` через `HttpClient`. Generate: один проход по stream, конкатенация O(n) символов. Catalog search/list chats: один проход O(n) + sort O(n log n).

11. **Тесты**  
    Моки: in-memory `LlmProvider` (два generate-chunk; install frames; list; stop-флаг), in-memory `ChatStore`, in-memory `CatalogLibrary`. Без `wiremock` в тестах use-cases. Filesystem store — отдельный тест на temp dir (roundtrip, backup). Архитектурный тест импортов. Живая Ollama не нужна.

## Risks / Trade-offs

- **Один провайдер на ModelService vs per-request `id`/`url`** → Mitigation: host конструирует сервис из актуального конфига; смена URL = новый сервис. Зафиксировано в rustdoc.
- **Search-фильтры DTO шире, чем Electron `searchModels`** → Mitigation: применяем поля, которые есть на карточке; пустые rating/downloads не режут выдачу. Поведение не хуже контракта 1.2.
- **Нет RAM/VRAM compatibility** → Mitigation: спека не требует OS-пробы; UI получит карточки без этих полей до отдельного change / host.
- **Синхронный `std::fs` в async store** → Mitigation: чаты — мелкие JSON; 2.4 может обернуть в `spawn_blocking`. Не блокируем generate (другой сервис).
- **Формат файла Electron может иметь расхождения version/поля** → Mitigation: serde с `deny_unknown_fields` **не** включать; неизвестные ключи игнорировать; обязательные поля как в текущем converter.

## Migration Plan

- Только аддитивно в `underlator-core`. Rollback = revert коммита атома.
- Electron/React не мигрируют. Потребление: атомы 3.x/5.x вызывают сервисы; 2.4 переедет файлы в hex-слои.

## Open Questions

Нет.
