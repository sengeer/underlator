# Tasks

## 1. Аудит контракта url (core / hosts)

- [x] 1.1 Подтвердить дыру: `InstallRequest` / `RemoveRequest` / `ListModelsRequest` / catalog requests и wiring `ModelService`/`CatalogService`/server/tauri не принимают UI `url` как источник истины — зафиксировать кратко в комментарии к задаче или чеклисте (verify: чтение `domain/model/dto.rs`, `application/model.rs`, `application/catalog.rs`, host routes/commands)
  - **Аудит 2026-09-26:** дыра подтверждена. `InstallRequest`/`RemoveRequest`/`ListModelsRequest`/`GetCatalogRequest` без `id`/`url`; `ModelService`/`CatalogService` держат один process `Arc`; server `GET /model/list` и tauri `model_list` не принимают url; env/process wiring — единственный источник.
- [x] 1.2 Если дыра есть (ожидаемо) — спланировать патч по design D2–D4; если вдруг контракт уже принимает url — явно отметить «уже так» в DoD с тестом-доказательством (verify: решение записано до правок DTO)
  - **Решение:** патч по D2–D4 (optional `id`/`url` в DTO; request-scoped provider через port factory; list query; env = fallback).

## 2. Core: DTO + use-cases (hex)

- [x] 2.1 Добавить optional `id`/`url` в `InstallRequest`, `RemoveRequest`, `ListModelsRequest` и catalog request DTO (`GetCatalogRequest` и связанные пути снимка) без переименования JSON-ключей; rustdoc на русском (verify: unit roundtrip serde в `domain`)
- [x] 2.2 В `application` для list/install/remove: при непустом `url` в запросе выполнять операцию через request-scoped провайдер (`create_provider`); иначе process `Arc`; `stop` не трогать (verify: unit-тесты mock/factory — явный url vs omit)
- [x] 2.3 В `catalog` local merge: учитывать request `url` (+ ключ кэша / forceRefresh по design D3 risk) (verify: unit-тест catalog с отличным url)
- [x] 2.4 Сохранить alias `embedded-ollama` → Ollama в factory; продуктовый default id = `ollama` (verify: существующие/обновлённые factory tests)
- [x] 2.5 Прогнать `cargo test -p underlator-core` включая `--test architecture` (verify: exit 0)

## 3. Hosts: pass-through url

- [x] 3.1 `underlator-server`: прокинуть `id`/`url` из body (install/remove/catalog) и query (list) в core; env — только fallback (verify: handler/test или ручная сверка JSON → DTO)
- [x] 3.2 `underlator-tauri`: invoke args list/install/remove/catalog передают `id`/`url` в core; generate/`stop` остаются на process Arc (verify: command signatures + compile `underlator-tauri`)

## 4. Frontend: убрать Embedded, API configuration MVP

- [x] 4.1 Сузить `ProviderType` / `PROVIDERS` / default в `provider-settings-slice` до `Ollama`; убрать ветки Embedded и macOS «только Embedded» (verify: `rg 'Embedded Ollama'` в типах/constants/slice — пусто или только migration)
- [x] 4.2 Settings UI: для `Ollama` всегда url + manage models; селектор/`switch(provider)` расширяемы без runtime облачных пунктов (verify: визуально/код `settings.tsx` ~API configuration)
- [x] 4.3 Persist migration: `Embedded Ollama` → `Ollama`, id `embedded-ollama` → `ollama`, сохранить model/url (verify: unit/тест hydrate или ручной сценарий localStorage)
- [x] 4.4 Вычистить hardcoded `provider: 'Embedded Ollama'` в `model-ipc-slice` / thunks; писать активного `Ollama` + settings (verify: `rg "Embedded Ollama"` в widgets/settings/models)
- [x] 4.5 Обобщить/переименовать manage-models UX (не обязан «Embedded» в имени); без полного FSD rewrite (verify: импорты/классы без обязательного Embedded в user-facing строках)
- [x] 4.6 Зачистить i18n/упоминания Embedded как отдельного провайдера и ветки в `use-model` / `chat-context` (verify: `rg 'Embedded Ollama'|embedded-ollama` в react-app product paths — только migration/alias при необходимости)

## 5. BackendClient + manage-models wiring

- [x] 5.1 Расширить `BackendClient` / transports: list/install/remove (+ catalog manage path) передают `id`/`url` из settings (verify: unit-тесты http/tauri transport)
- [x] 5.2 `model-and-catalog-ipc` / thunks manage models читают url + provider id из Redux settings и передают в клиент (verify: вызов install/list с настроенным url в коде пути)

## 6. Регрессии и границы скоупа

- [x] 6.1 Не трогать RAG (6.1) / splash (6.2) входные точки сверх необходимости; не начинать 6.4 / 7.1; не реализовывать OpenRouter/Claude adapters (verify: diff review + `rg 'TODO\\(rag\\)|TODO\\(splash\\)'` без удаления маркеров)
- [x] 6.2 MVP generate/chat через `BackendClient` без регрессий wiring (verify: существующие client/unit тесты react-app по возможности)

## Definition of Done

- [x] DoD.1 В UI нет `Embedded Ollama`; runtime-провайдер MVP = `Ollama` + видимый `url` + `manage models` по этому url
- [x] DoD.2 Manage-models list/install/remove/catalog используют url (+ provider id) из settings, не hardcoded Embedded
- [x] DoD.3 Миграция `Embedded Ollama` → `Ollama` описана и сделана (model/url сохранены по возможности)
- [x] DoD.4 Контракт core/hosts принимает url из запроса **или** явно зафиксировано «уже так» с проверкой (для текущего кода ожидается патч DTO/application/hosts)
- [x] DoD.5 `cargo test -p underlator-core` (+ architecture) зелёный, если менялся core
- [x] DoD.6 Вне скоупа соблюдено: OpenRouter/Claude adapters, 6.4, 7.1, RAG/splash regress
