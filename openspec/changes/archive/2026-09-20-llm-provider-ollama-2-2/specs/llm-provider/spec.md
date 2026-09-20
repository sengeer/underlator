# Spec Delta

## Purpose

Отделяет операции генерации и управления моделями от конкретного вендора LLM: ядро вызывает абстракцию провайдера, Ollama — первый runtime-адаптер, облачные id остаются stubs до отдельного opt-in.

## ADDED Requirements

### Requirement: Provider abstraction covers generate stop list install remove
Ядро SHALL предоставлять абстракцию LLM-провайдера с операциями потоковой генерации, остановки, списка локальных моделей, установки и удаления. Вызывающий код MUST обращаться к этим операциям без знания вендорных HTTP-путей. Для провайдеров без локального реестра моделей операции установки и удаления MUST возвращать классифицированную ошибку unsupported, а не паниковать.

#### Scenario: Generate stream yields progress chunks
- **WHEN** вызывающий код запускает потоковую генерацию через абстракцию провайдера с запросом, содержащим `model` и `prompt`
- **THEN** провайдер MUST отдавать инкрементальные chunk прогресса с полями `response` и `done`
- **AND** MUST NOT требовать, чтобы вызывающий код собирал URI `/api/generate`

#### Scenario: Stop cancels in-flight generation
- **WHEN** идёт активная потоковая генерация и вызывается остановка
- **THEN** провайдер MUST прервать доставку последующих chunk
- **AND** MUST вернуть классифицированную ошибку отмены или завершить поток без новых токенов

#### Scenario: List models returns local inventory
- **WHEN** вызывающий код запрашивает список моделей через абстракцию
- **THEN** успешный ответ MUST содержать массив `models` с элементами, у которых есть `name`, `size` и `modified_at`

#### Scenario: Install and remove on cloud stub are unsupported
- **WHEN** выбран stub облачного провайдера (`openrouter` или `anthropic`) и вызываются установка или удаление модели
- **THEN** операция MUST завершиться ошибкой unsupported
- **AND** MUST NOT выполнять исходящий HTTP к облачному API

### Requirement: Ollama adapter ports current generate and model management
Ядро SHALL предоставлять runtime-адаптер локального Ollama, который выполняет generate (NDJSON stream), list, install (stream progress) и remove через унифицированный HTTP-клиент ядра. Адаптер MUST использовать base URL из конфига провайдера (`url`) и MUST NOT ходить в сеть в обход клиента. Поля `id` и `url` запроса generate MUST NOT отправляться как тело Ollama API. Эмбеддинги, `show` и health-check MUST NOT входить в этот атом.

#### Scenario: Ollama generate uses configured base URL
- **WHEN** адаптер Ollama получает `url` вида `http://127.0.0.1:11434` и запрос generate
- **THEN** исходящий POST MUST идти на `{url}/api/generate` через клиент ядра
- **AND** JSON-тело MUST содержать `model` и `prompt` и MUST NOT содержать ключи `id` и `url`

#### Scenario: Ollama list install and remove hit vendor endpoints
- **WHEN** адаптер Ollama выполняет list, install и remove
- **THEN** list MUST быть GET `{url}/api/tags`
- **AND** install MUST быть POST `{url}/api/pull` с потоком прогресса
- **AND** remove MUST быть DELETE `{url}/api/delete`; пустой успешный HTTP-ответ MUST считаться `{ "success": true }`

#### Scenario: Ollama adapter does not bypass HTTP client
- **WHEN** адаптер Ollama выполняет любую из операций generate/list/install/remove
- **THEN** исходящий HTTP MUST идти через унифицированный клиент ядра
- **AND** исходники адаптера MUST NOT импортировать `reqwest` или `hyper`

### Requirement: Registry selects provider by id
Ядро SHALL выбирать реализацию провайдера по `provider_id` из конфига. Идентификаторы `ollama` и `embedded-ollama` MUST резолвиться в runtime-адаптер Ollama. Неизвестный id MUST давать классифицированную ошибку, а не молча подменять вендора.

#### Scenario: ollama id resolves to runtime adapter
- **WHEN** factory/реестр получает `provider_id` `ollama` или `embedded-ollama` и валидный `url`
- **THEN** результат MUST быть исполняемым адаптером Ollama
- **AND** последующий list/generate MUST быть возможен без другого `provider_id`

#### Scenario: Unknown provider id fails closed
- **WHEN** factory/реестр получает неизвестный `provider_id`
- **THEN** создание провайдера MUST завершиться ошибкой unknown provider
- **AND** MUST NOT выполнить исходящий HTTP

### Requirement: Only Ollama is runtime-required in MVP
Для MVP runtime-обязательным SHALL быть только локальный Ollama. Идентификаторы `openrouter` и `anthropic` MUST существовать как stubs без полной облачной реализации: операции генерации и списка моделей MUST возвращать unsupported, пока адаптер не будет реализован отдельным изменением.

#### Scenario: Cloud stub generate is unsupported
- **WHEN** factory создаёт stub `openrouter` или `anthropic` при явном opt-in и вызывается generate или list
- **THEN** операция MUST вернуть ошибку unsupported
- **AND** MUST NOT вызывать внешний облачный HTTP API

### Requirement: Provider config DTO stays compatible
Конфиг провайдера SHALL оставаться совместимым с текущим `ElectronApiConfig` / provider settings: обязательные поля `id` и `url`. Значение по умолчанию для локального режима MUST быть `id = "ollama"` и URL локального Ollama (`http://127.0.0.1:11434`), если вызывающий код не задал иное. Это изменение MUST NOT требовать переименования JSON-ключей `id`/`url` на стороне React.

#### Scenario: Default local provider config
- **WHEN** конфиг провайдера собирается без явного облачного id
- **THEN** `id` MUST быть `ollama`
- **AND** `url` MUST указывать на локальный Ollama `http://127.0.0.1:11434`

#### Scenario: Existing id and url keys roundtrip
- **WHEN** конфиг с полями `id` и `url` сериализуется в JSON и обратно
- **THEN** ключи MUST остаться `id` и `url`
- **AND** значения MUST совпасть с исходными

### Requirement: Local Ollama is default cloud is explicit opt-in
Продуктовая политика конфиденциальности SHALL считать локальный Ollama режимом по умолчанию. Облачные провайдеры (`openrouter`, `anthropic`) MUST создаваться только при явном opt-in в данных конфига ядра. Реализация UI-предупреждения MUST NOT входить в этот атом.

#### Scenario: Cloud provider without opt-in is rejected
- **WHEN** factory получает `provider_id` облака без флага явного opt-in
- **THEN** создание MUST завершиться ошибкой, что облако не включено
- **AND** MUST NOT выполнять исходящий HTTP

#### Scenario: Local default does not require opt-in
- **WHEN** factory получает `provider_id` `ollama` без облачного opt-in
- **THEN** адаптер Ollama MUST быть создан успешно

### Requirement: Provider change stays inside core adapters
Этот атом MUST добавить только абстракцию провайдера, адаптер Ollama, stubs и реестр в `underlator-core`. Он MUST NOT реализовывать use-cases `model`/`catalog`/`chat`, входящие Axum routes, Tauri commands, RAG и изменения React.

#### Scenario: No use-case or host runtime
- **WHEN** атом 2.2 завершён
- **THEN** в core нет исполняемых use-case функций generate/CRUD чата/выборки каталога (вызовы идут только через абстракцию провайдера в тестах адаптера)
- **AND** `underlator-server` и `underlator-tauri` не получают MVP routes/commands и не ходят к LLM в обход core
- **AND** `electron-app/` и `react-app/` остаются без обязательных правок этого атома
