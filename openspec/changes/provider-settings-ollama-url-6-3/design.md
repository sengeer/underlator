# Design

## Context

См. proposal.md — Why. Наблюдаемое состояние:

- UI: `ProviderType = 'Ollama' | 'Embedded Ollama'`; default и manage models завязаны на Embedded (`settings.tsx` ~465–476, `model-ipc-slice` hardcoded provider, `PROVIDERS` с macOS-веткой «только Embedded»).
- Core: `GenerateRequest` уже имеет `id`/`url`; `InstallRequest` / `RemoveRequest` / `ListModelsRequest` — нет. `ModelService` / `CatalogService` держат один `Arc<dyn LlmProvider>` с URL process wiring; комментарий в application явно говорит, что `id`/`url` generate не пересобирают провайдера (ради `stop`).
- Hosts: server/tauri создают provider один раз из env/config; handlers передают DTO as-is, но list/install/remove не несут url.
- `BackendClient.model.list|install|remove` не принимают provider config (в отличие от `generate`).

Порядок этапа: 6.1 → 6.2 → **6.3** → 6.4 → 7.1. Hex-границы 2.4 обязательны для любых правок core.

## Goals / Non-Goals

**Goals:**

- Убрать Embedded из продуктового UI/типов/defaults; MVP = `Ollama` + url + manage models по url settings
- Миграция persist Embedded → Ollama
- Закрыть контрактную дыру: list/install/remove/catalog local merge принимают `id`/`url` из запроса; hosts прокидывают; env = fallback
- Сохранить `stop` на process-scoped generate provider
- Расширяемый селектор/`switch` без реализации облачных адаптеров

**Non-Goals:**

- Полные OpenRouter/Claude adapters; ollama-manager / splash lifecycle в rust-core
- Per-request пересборка generate-провайдера (ломает stop) — вне минимального скоупа, кроме уже существующих полей в generate DTO
- 6.4 perf, 7.1 Electron removal, RAG в core, широкий FSD rewrite settings

## Decisions

### D1. Продуктовый id = `ollama`; `embedded-ollama` — только alias в factory

- **Выбор:** UI и persist после миграции используют display `Ollama` / id `ollama`. Core factory сохраняет резолв `embedded-ollama` → тот же Ollama-адаптер (back-compat старых payload).
- **Альтернатива:** удалить alias из core сразу — риск сломать старые запросы до полной зачистки.
- **Почему:** фронт нормализует persist; alias дёшев и уже есть в `llm-provider`.

### D2. Опциональные `id`/`url` на list/install/remove и catalog requests

- **Выбор:** добавить optional `id`/`url` (serde skip_if none/empty) в `InstallRequest`, `RemoveRequest`, `ListModelsRequest`, и в catalog request DTO (`GetCatalogRequest` и пути, которые строят снимок через local list). JSON-ключи без переименования.
- **Альтернатива A:** отдельный header `X-Ollama-Url` — хуже для Tauri invoke и единого DTO.
- **Альтернатива B:** только менять process config из UI — нет multi-url, требует restart host.
- **Почему:** зеркало generate; один контракт для HTTP/Tauri/Electron.

### D3. Request-scoped provider для manage-models; process Arc для generate/stop

- **Выбор:** если в запросе list/install/remove/catalog задан непустой `url`, application (или тонкий helper в adapters/out + вызов из application через port/factory API) создаёт **краткоживущий** провайдер через существующую `create_provider` с этим url и выполняет операцию на нём. Generate/`stop` остаются на process `Arc`. Если url опущен — process provider.
- **Альтернатива:** мутировать `base_url` на shared client — гонки с concurrent generate.
- **Альтернатива:** всегда один process url, синхронизировать env из UI — не dual-mode friendly, не «UI источник истины».
- **Почему:** закрывает 6.3 без ломания stop; ephemeral cost O(1) на manage-операцию приемлем.

### D4. HTTP list: query params для optional id/url

- **Выбор:** `GET /api/model/list?id=&url=` (url-encoded), пустые = fallback. Install/remove/catalog — поля в JSON body. Менять list на POST не требуется.
- **Альтернатива:** POST `/api/model/list` — ломает карту имён/приёмку 4.2 без нужды.
- **Почему:** сохраняет GET из naming map.

### D5. Frontend: normalize + wire settings url, лёгкий rename manage UX

- **Выбор:** сузить `ProviderType` до `'Ollama'` (или оставить union с deprecated и нормализовать на входе — предпочтительно убрать Embedded из типа). `PROVIDERS = { Ollama: 'Ollama' }`. Persist migration в slice/`createMigrate` или при hydrate. Thunks читают `selectActiveProviderSettings` / текущий provider. Manage-embedded-ollama переименовать/обобщить (файл/класс/комментарии) без полного FSD rewrite. Extension points: `switch(provider)` + закомментированные/пустые ветки под future API key с `TODO(cloud-provider)` при желании — без реализации.
- **Альтернатива:** feature-flag Embedded «скрыт» — противоречит «убрать из продукта».
- **Почему:** соответствует атому 6.3 и паттерну 6.1/6.2 (точечные UI-правки).

### D6. BackendClient сигнатуры

- **Выбор:** `list(config?)`, `install(request)`, `remove(request)` где request/config несут optional id/url; catalog methods принимают optional config, мержащийся в DTO. Транспорты сериализуют поля.
- **Альтернатива:** только расширить request types и не менять сигнатуры list() — тоже ок, если list принимает `ListModelsRequest` вместо void; предпочтительно явный request object для симметрии с core.

### D7. Проверка «уже так» vs патч

- **Выбор:** DoD обязан зафиксировать результат аудита: либо патч DTO/use-cases/hosts (ожидаемый путь — дыра подтверждена), либо явная запись в tasks/DoD «контракт уже принимает url» с проверкой тестами. Молчаливый skip запрещён.

## Risks / Trade-offs

- [Risk] Ephemeral provider на каждый list/install → лишние HTTP-клиенты → Mitigation: создавать только при отличном/явном url; иначе process Arc; без keep-alive гонки.
- [Risk] Catalog cache ключуется без url → чужой inventory в кэше → Mitigation: учитывать url в ключе кэша или не кэшировать при explicit url / forceRefresh.
- [Risk] Electron preload list() без url → Mitigation: Electron transport best-effort (поля MAY игнорироваться Electron до 7.1); Tauri/HTTP — обязательный путь dual-mode MVP.
- [Risk] Неполная зачистка строк «Embedded» в i18n/комментариях → Mitigation: `rg 'Embedded Ollama'` в DoD checklist.
- [Trade-off] Generate по-прежнему может ходить на process url, игнорируя поля DTO — сознательно вне минимального 6.3 (manage models); отдельный follow-up при необходимости паритета generate.

## Migration Plan

1. Задеплоить/смержить фронт с normalize Embedded→Ollama при hydrate (идемпотентно).
2. Расширить core DTO + use-cases + тесты; прогнать `cargo test -p underlator-core` (+ architecture).
3. Обновить server/tauri pass-through; клиентские транспорты.
4. Rollback: старые клиенты без id/url на list/install продолжают работать через process fallback; UI без Embedded безопасен вперёд.

## Open Questions

Нет блокирующих: выбор query vs body для list зафиксирован в D4; generate-url override отложен (Risk/Trade-off).
