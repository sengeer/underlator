# mvp-use-cases Specification

## Purpose
Исполняемые use-cases MVP `model`, `catalog` и `chat` в `underlator-core`: бизнес-логика трёх доменов работает через ports (`LlmProvider`, catalog library, `ChatStore` / `StorageRoot`) без Tauri, Axum и Electron.

## Requirements

### Requirement: Model use-cases run through LLM provider
Ядро SHALL предоставлять исполняемые use-cases поверхности `model`: потоковая генерация, остановка, установка с прогрессом, удаление и список локальных моделей. Эти операции MUST идти через абстракцию LLM-провайдера. Use-case MUST NOT собирать вендорные HTTP-пути и MUST NOT импортировать `reqwest` или `hyper`. Пустые обязательные поля (`model`, `prompt` для generate; `name` для install/remove) MUST давать классифицированную ошибку валидации без вызова провайдера.

#### Scenario: Generate streams progress and returns concatenated text
- **WHEN** вызывается generate с непустыми `model` и `prompt`, а провайдер отдаёт два chunk с полем `response`
- **THEN** use-case MUST доставить оба chunk прогресса вызывающему коду (событие `model:generate-progress`)
- **AND** унарный результат MUST быть конкатенацией полей `response` в порядке chunk
- **AND** MUST NOT требовать URI `/api/generate` в коде use-case

#### Scenario: Stop cancels in-flight generate
- **WHEN** идёт активная генерация и вызывается stop
- **THEN** последующие chunk MUST не доставляться как успешные токены
- **AND** операция MUST завершиться классифицированной отменой или без новых токенов

#### Scenario: Install remove and list delegate to provider
- **WHEN** вызываются install, remove или list
- **THEN** install MUST отдавать кадры прогресса до завершения и вернуть `{ "success": true }` при успехе
- **AND** remove MUST вернуть `{ "success": true }` при успехе
- **AND** list MUST вернуть массив `models` с `name`, `size`, `modified_at`
- **AND** MUST NOT выполнять исходящий HTTP в обход провайдера

#### Scenario: Missing required generate fields fail closed
- **WHEN** generate вызывается без `model` или без `prompt` (пустая строка)
- **THEN** use-case MUST вернуть ошибку валидации
- **AND** MUST NOT вызывать провайдера

### Requirement: Catalog use-cases combine local inventory and library
Ядро SHALL предоставлять use-cases `catalog.get`, `catalog.search` и `catalog.getModelInfo`. Снимок каталога MUST объединять локально установленные модели (через список провайдера) с карточками библиотеки (через port источника каталога). Исходящий HTTP к library API MUST идти только через унифицированный HTTP-клиент ядра в адаптере источника, не из use-case. При сбое источника библиотеки use-case MUST отдать статический запасной список, а не падать целиком. При сбое списка локальных моделей MUST вернуть пустой локальный набор и сохранить библиотечные карточки. Локальные имена MUST вытеснять одноимённые библиотечные (дедуп по `name`). `forceRefresh = true` MUST обойти кэш; повторный `get` без refresh в пределах TTL MUST не дергать источник библиотеки повторно.

#### Scenario: Get merges local and library without duplicate names
- **WHEN** провайдер возвращает локальную модель `llama` и библиотека — `llama` плюс `qwen3`
- **THEN** снимок MUST содержать локальную карточку `llama` и библиотечную `qwen3`
- **AND** MUST NOT содержать две карточки с одним `name` `llama`
- **AND** ответ MUST включать `ollama`, `totalCount` и `lastUpdated`

#### Scenario: Library failure falls back to static list
- **WHEN** источник библиотеки возвращает ошибку сети, а локальный список успешен
- **THEN** `catalog.get` MUST завершиться успехом
- **AND** MUST включить статический запасной набор библиотечных карточек (как минимум одну известную модель вроде `qwen3`) вместе с локальными

#### Scenario: Local list failure keeps library cards
- **WHEN** список провайдера завершается ошибкой, а библиотека успешна
- **THEN** `catalog.get` MUST вернуть библиотечные карточки
- **AND** MUST NOT требовать доступности локального LLM для ответа

#### Scenario: Force refresh bypasses cache
- **WHEN** каталог уже закэширован и вызывается `get` с `forceRefresh = true`
- **THEN** use-case MUST заново запросить локальный список и источник библиотеки
- **AND** повторный `get` без refresh в пределах TTL MUST вернуть кэш без повторного запроса библиотеки

#### Scenario: Search filters the catalog snapshot
- **WHEN** `catalog.search` получает фильтры (как минимум `search`, границы `minSize`/`maxSize`, `tags`, сортировка и пагинация `limit`/`offset`)
- **THEN** ответ MUST содержать только карточки, удовлетворяющие заданным фильтрам
- **AND** `totalCount` MUST отражать число после фильтрации (до пагинации, если заданы `limit`/`offset`)

#### Scenario: Get model info returns card or null
- **WHEN** `catalog.getModelInfo` ищет существующее `modelName`
- **THEN** ответ MUST содержать карточку с совпадающим `name` (точное совпадение или включение имени, как в текущем Electron)
- **AND** если карточки нет, результат MUST быть `null`, а не ошибкой not found

### Requirement: Chat use-cases persist through ChatStore
Ядро SHALL предоставлять use-cases `chat.create`, `chat.get`, `chat.update`, `chat.delete`, `chat.list` и `chat.addMessage`. Persist MUST идти только через port `ChatStore`. Use-case MUST генерировать идентификаторы чата и сообщения и временные метки ISO-8601. Пустой `title` на create и пустые `chatId`/`content` на addMessage MUST давать ошибку валидации без записи в store.

#### Scenario: Create returns a new chat with empty messages
- **WHEN** create вызывается с `title` и `defaultModel`
- **THEN** ответ MUST быть полным чатом с новым `id`, пустым `messages`, заданным `title` и `defaultModel`
- **AND** чат MUST быть доступен последующим `get` по этому `id`

#### Scenario: Get applies message window
- **WHEN** get вызывается с `includeMessages = false`
- **THEN** ответ MUST содержать чат с пустым массивом `messages`
- **AND** когда `includeMessages` не false и заданы `messageLimit` / `messageOffset`, MUST вернуть срез сообщений этого окна

#### Scenario: Update patches fields and bumps updatedAt
- **WHEN** update меняет `title` существующего чата
- **THEN** ответ MUST содержать новый `title`
- **AND** `updatedAt` MUST быть не раньше прежнего значения
- **AND** незаданные patch-поля MUST сохраниться

#### Scenario: Delete requires confirmation
- **WHEN** delete вызывается без `confirmed = true`
- **THEN** операция MUST завершиться ошибкой (удаление не подтверждено)
- **AND** чат MUST остаться в store
- **AND** при `confirmed = true` MUST удалить чат и вернуть `{ "deletedChatId": "<id>" }`

#### Scenario: List filters sorts and paginates
- **WHEN** list вызывается с фильтрами, сортировкой и `limit`/`offset`
- **THEN** элементы MUST быть краткими записями без полной истории сообщений
- **AND** ответ MUST включать `chats`, `totalCount` и `pagination`

#### Scenario: Add message appends and returns updated chat
- **WHEN** addMessage добавляет сообщение с `role` и `content` в существующий чат
- **THEN** ответ MUST содержать новое `message` (с `id` и `timestamp`) и `updatedChat`
- **AND** повторный get MUST включать это сообщение в конце истории

#### Scenario: Missing chat is not found
- **WHEN** get, update, delete или addMessage вызываются с неизвестным `chatId`
- **THEN** операция MUST вернуть классифицированную ошибку not found
- **AND** MUST NOT создавать чат неявно

### Requirement: ChatStore and StorageRoot ports
Ядро SHALL определить port `ChatStore` для сохранения, чтения, удаления и перечисления чатов и port `StorageRoot` как корень файлового (или иного) хранилища. Use-cases chat MUST зависеть только от этих ports, а не от конкретного filesystem API. Смена реализации store MUST NOT требовать правки сигнатур chat use-cases.

#### Scenario: Use-cases work with an in-memory store
- **WHEN** chat use-cases сконструированы с mock/`in-memory` `ChatStore`
- **THEN** create / get / addMessage MUST работать без обращения к диску
- **AND** MUST NOT требовать путь `StorageRoot`

#### Scenario: Filesystem store uses storage root
- **WHEN** filesystem `ChatStore` получает `StorageRoot` и сохраняет чат
- **THEN** данные MUST оказаться под этим корнем в файле вида `{id}.chat.json`
- **AND** повторная загрузка по `id` MUST вернуть тот же чат по смыслу (`id`, `title`, `messages`, `defaultModel`)

### Requirement: Filesystem chat store matches current chat files
Filesystem-backed `ChatStore` SHALL быть совместим по смыслу с текущим `ChatFileSystemService`: один файл на чат, атомарная запись, JSON с версией, метаданными и сообщениями. Запись MUST быть атомарной (временный файл + замена), чтобы оборванная запись не оставляла частично записанный чат как единственную копию. При `createBackup = true` на delete store MUST сохранить копию до удаления.

#### Scenario: Roundtrip chat file
- **WHEN** чат с одним сообщением сохраняется через filesystem store и читается снова
- **THEN** `id`, `title`, роли и тексты сообщений MUST совпасть
- **AND** файл MUST лежать как `{id}.chat.json` под корнем чатов

#### Scenario: Atomic write does not leave a torn file as the only copy
- **WHEN** запись чата прерывается до завершения замены
- **THEN** предыдущая успешная версия MUST остаться читаемой либо операция MUST завершиться ошибкой storage без молчаливой порчи
- **AND** успешная запись MUST быть видна последующему load

#### Scenario: Delete with backup keeps a copy
- **WHEN** delete выполняется с `confirmed = true` и `createBackup = true`
- **THEN** чат MUST исчезнуть из основного перечисления
- **AND** резервная копия MUST существовать под корнем хранилища

### Requirement: Domain errors map to host error classes
Ядро SHALL расширить доменные ошибки (`thiserror`) вариантами валидации, not found, неподтверждённого удаления и сбоя хранилища. Ядро SHALL публиковать маппинг этих ошибок в host-агностичные классы (`invalid`, `not_found`, `cancelled`, `unsupported`, `provider`, `storage`, `http`) без типов `axum` или `tauri`. Host-слой MUST иметь возможность выбрать HTTP-статус или код Tauri по этому классу, не разбирая строку `Display`.

#### Scenario: Not found maps to not_found class
- **WHEN** chat get запрашивает неизвестный id
- **THEN** ошибка MUST отображаться в класс `not_found`
- **AND** публичный тип ошибки MUST NOT зависеть от `axum` или `tauri`

#### Scenario: Validation maps to invalid class
- **WHEN** create вызывается с пустым `title`
- **THEN** ошибка MUST отображаться в класс `invalid`

#### Scenario: Provider cancelled maps to cancelled class
- **WHEN** generate прерывается через stop
- **THEN** ошибка MUST отображаться в класс `cancelled`

### Requirement: Key use-cases are tested with mock ports
Ключевые use-cases SHALL быть покрыты unit-тестами без живой Ollama и без внешней сети: mock LLM-провайдер, mock `ChatStore` и mock источник каталога. Тесты filesystem store MAY использовать временный каталог.

#### Scenario: Model generate is tested with mock provider
- **WHEN** прогоняются тесты ядра
- **THEN** generate с mock-провайдером MUST подтвердить доставку chunk и конкатенацию текста
- **AND** MUST NOT поднимать сетевой сервер для этого сценария

#### Scenario: Chat CRUD is tested with mock store
- **WHEN** прогоняются тесты ядра
- **THEN** create / get / addMessage / delete на mock store MUST проходить без диска

### Requirement: Change stays inside core use-cases
Этот атом MUST добавить use-cases и storage ports только в `underlator-core`. Он MUST NOT добавлять Axum routes, Tauri commands, React `BackendClient`, RAG, выпил Electron и MUST NOT выполнять гексагональную раскладку папок атома 2.4 (`domain/` / `ports/` / `application/` / `adapters/out` как обязательная структура).

#### Scenario: No host routes or hex relocation
- **WHEN** атом 2.3 завершён
- **THEN** `underlator-server` и `underlator-tauri` не имеют MVP HTTP routes / Tauri commands из этого атома
- **AND** `electron-app/` и `react-app/` остаются без обязательных правок
- **AND** публичный crate ядра по-прежнему не зависит от `tauri` и `axum`
- **AND** обязательная hex-раскладка 2.4 ещё не требуется
