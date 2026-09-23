# tauri-thin-host Specification

## Purpose
Даёт desktop-host Underlator: тонкий Tauri 2 inbound-адаптер над существующими use-cases MVP `model` / `catalog` / `chat`, с progress events, desktop `StorageRoot` и hex-запретом обхода ядра.

## Requirements

### Requirement: Tauri host is a driving adapter over core
`underlator-tauri` SHALL быть driving/inbound adapter: разобрать invoke-вход, вызвать application/ports API `underlator-core` и сериализовать ответ / emit события. Host MUST NOT дублировать доменные правила generate, merge каталога или CRUD чата. Host MUST NOT выполнять исходящий HTTP к LLM или library API в обход ядра (`reqwest`, прямой URI Ollama `/api/generate`). Публичный crate ядра MUST NOT зависеть от `tauri`.

#### Scenario: Commands delegate to application services
- **WHEN** зарегистрирована MVP-команда host и поступает валидный invoke
- **THEN** handler MUST вызвать `ModelService` / `CatalogService` / `ChatService` (или эквивалентный публичный application API ядра)
- **AND** MUST NOT реализовывать merge каталога, валидацию CRUD чата или стрим провайдера внутри host вне вызова ядра

#### Scenario: Host does not call Ollama directly
- **WHEN** исходники `crates/underlator-tauri` инспектируются на исходящий LLM HTTP
- **THEN** MUST NOT быть прямого клиента к Ollama / library API в обход `underlator-core`
- **AND** зависимость `reqwest` для LLM MUST NOT появляться в `underlator-tauri`

### Requirement: MVP Tauri commands match core name map
Host SHALL регистрировать Tauri commands для всех 14 операций карты имён ядра. Имена команд MUST совпадать с `tauri_command` из контракта ядра: `model_generate`, `model_stop`, `model_install`, `model_remove`, `model_list`, `catalog_get`, `catalog_search`, `catalog_get_model_info`, `chat_create`, `chat_get`, `chat_update`, `chat_delete`, `chat_list`, `chat_add_message`. Операции `rag.*` и `splash.*` MUST NOT получать commands в этом атоме. Унарные ответы (кроме потокового progress generate/install) MUST быть JSON/DTO телами контракта ядра, без обязательной обёртки Electron `IpcResponse`.

#### Scenario: Fourteen MVP commands are registered
- **WHEN** desktop host с feature runtime запущен и frontend вызывает `BackendClient` через Tauri-транспорт
- **THEN** каждая из 14 MVP-операций MUST иметь соответствующую Tauri command с именем из карты ядра
- **AND** MUST NOT быть commands `rag.*` или `splash.*` как обязательной части MVP этого атома

#### Scenario: Unary chat and catalog return core DTO bodies
- **WHEN** вызываются `catalog_get` / `catalog_search` / `catalog_get_model_info` или CRUD чата / `chat_add_message`
- **THEN** успешный ответ MUST содержать ключи DTO ядра (как у server 3.1 / `BackendClient`)
- **AND** `catalog_get_model_info` при отсутствии модели MUST вернуть отсутствие (`null`), а не обязательную ошибку «не найдено», если так ведёт себя application API ядра

### Requirement: Generate and install progress use Tauri events
Host SHALL доставлять прогресс `model.generate` и `model.install` через Tauri events с именами `model:generate-progress` и `model:install-progress`. Payload MUST быть JSON DTO ядра (`GenerateProgress` / `InstallProgress`). Успешное завершение операции MUST возвращаться как результат invoke (строка generate / `{ "success": true }` для install), а не как замена progress-событий. `model_stop` MUST оставаться унарной командой на том же экземпляре провайдера, что и активный generate.

#### Scenario: Generate emits progress then resolves invoke
- **WHEN** выполняется валидный `model_generate` при живом провайдере
- **THEN** host MUST эмитить кадры события `model:generate-progress` с полями прогресса ядра
- **AND** Promise/результат invoke MUST разрешиться сконкатенированной строкой ответа
- **AND** MUST NOT требовать HTTP SSE или WebSocket для desktop progress

#### Scenario: Install emits progress then unary success
- **WHEN** выполняется валидный `model_install`
- **THEN** кадры MUST приходить как `model:install-progress`
- **AND** успешный результат invoke MUST соответствовать `{ "success": true }`

#### Scenario: Stop cancels in-flight generate on same provider
- **WHEN** идёт активный generate и вызывается `model_stop`
- **THEN** host MUST вызвать `ModelService::stop` на том же wiring провайдера
- **AND** активный generate MUST завершиться без новых успешных токенов (ошибка `cancelled` или эквивалент контракта ядра)

### Requirement: Desktop StorageRoot uses app data directory
Host SHALL задавать `StorageRoot` для `FilesystemChatStore` (или эквивалентного адаптера ядра) через каталог данных desktop-приложения (app data dir платформы / конфиг host). Путь MUST NOT быть захардкоженным server/docker-путём вроде `/data`. Провайдер на старте MUST собираться один раз через factory ядра (как у server), без per-request пересборки по полям `id`/`url` в generate DTO.

#### Scenario: Chats persist under desktop data dir
- **WHEN** desktop host стартует и создаёт/читает чат через MVP commands
- **THEN** файлы чатов MUST лежать под `StorageRoot`, указывающим на desktop app data dir (или явно заданный desktop override)
- **AND** MUST NOT требовать volume `/data` docker-compose для работы desktop chat store

#### Scenario: Single provider instance for stop
- **WHEN** host выполняет wiring на старте
- **THEN** `ModelService` и связанные use-cases MUST разделять один `Arc` провайдера процесса
- **AND** поля `id`/`url` в теле generate MUST NOT создавать второй клиент провайдера в host

### Requirement: Host errors preserve HostErrorClass
Ошибки application/ports API на границе Tauri SHALL отображаться в класс `HostErrorClass` ядра (или эквивалентную сериализацию `{ "class", "message" }`), чтобы `TauriTransport` мог поднять `BackendError` без потери класса. Host MUST NOT глотать ошибки ядра как безымянный success.

#### Scenario: Not found surfaces as classified error
- **WHEN** chat get запрашивает отсутствующий id
- **THEN** invoke MUST завершиться ошибкой с классом, согласованным с `host_error_class` ядра (как `not_found`)
- **AND** MUST NOT возвращать успешное тело чата

### Requirement: Desktop-only stubs are non-blocking
Host MAY содержать заготовки desktop-only поверхностей (mailto, native dialogs). Они MUST NOT блокировать приёмку MVP `model` / `catalog` / `chat`. Runtime splash / embedded Ollama installer MUST NOT реализовываться в этом атоме.

#### Scenario: Mailto or dialog stub does not gate MVP
- **WHEN** MVP commands `model` / `catalog` / `chat` принимаются
- **THEN** отсутствие рабочего mailto / native dialog / splash runtime MUST NOT делать приёмку MVP неуспешной
- **AND** исходники MUST NOT содержать обязательный runtime installer embedded Ollama как DoD этого атома

### Requirement: Electron parity checklist for MVP scenarios
Атом 5.1 SHALL зафиксировать чеклист сравнения поведения Tauri desktop с Electron на тех же MVP-сценариях `model` / `catalog` / `chat` (happy-path и основные ошибки). Полное удаление Electron / `ElectronTransport` / `electron-app` MUST NOT входить в скоуп. После атома 5.2 unit/mock host-тесты и успешный `cargo tauri dev` MUST NOT считаться заменой shipping-приёмки канонического AppImage на Fedora Workstation 44 (см. capability `desktop-tauri-build`); выпил Electron по-прежнему MUST ждать закрытия 5.2.

#### Scenario: Parity checklist covers MVP surfaces
- **WHEN** DoD атома 5.1 выполняется
- **THEN** MUST существовать явный чеклист (в tasks/приёмке) для generate/stop/install/remove/list, catalog get/search/info и chat CRUD/addMessage
- **AND** MUST NOT требовать удаления `electron-app` или `ElectronTransport`

#### Scenario: Unit and tauri-dev do not waive AppImage shipping gate
- **WHEN** оценивается готовность к атому 6.1 после 5.1
- **THEN** наличие unit/mock тестов host или успешного `tauri dev` MUST NOT считаться закрытием shipping gate атома 5.2
- **AND** MUST NOT начинать удаление Electron, пока `desktop-tauri-build` не принят на Fedora 44 AppImage smoke
