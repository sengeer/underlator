# Spec Delta

## Purpose

Фиксирует строгую гексагональную раскладку `underlator-core` (ports & adapters) и автоматическую проверку границ слоёв, чтобы атомы 3.x+ не возвращались к плоским модулям у корня crate.

## ADDED Requirements

### Requirement: Core source tree uses hexagonal layers
`underlator-core` SHALL раскладывать исходники по слоям `domain` (DTO, события, доменные ошибки, без IO), `ports` (traits исходящих зависимостей), `application` (use-cases, зависят только от ports и domain) и `adapters/out` (исходящий IO: HTTP-клиент, LLM-адаптеры, filesystem store). Корень `src/lib.rs` SHALL быть composition root: wiring и `pub use`, без доменных правил. Inbound adapters MUST NOT появляться внутри core — они живут в host-crates.

#### Scenario: Target directories exist
- **WHEN** разработчик просматривает `crates/underlator-core/src/`
- **THEN** присутствуют каталоги `domain/`, `ports/`, `application/` и `adapters/out/`
- **AND** исходящий HTTP-клиент MUST находиться под `adapters/out/`
- **AND** runtime-адаптер локального LLM MUST находиться под `adapters/out/`
- **AND** filesystem store чатов MUST находиться под `adapters/out/`

#### Scenario: No new flat production modules at src root
- **WHEN** атом 2.4 завершён
- **THEN** production-модули MVP (`model` / `catalog` / `chat` use-cases, HTTP-клиент, провайдер) MUST NOT оставаться обязательными соседними пакетами у корня `src/` в обход слоёв
- **AND** новые production-модули после этого атома MUST добавляться только в hex-слои или в composition root

### Requirement: Layer import rules are enforced
Слой `application` MUST NOT импортировать `adapters` напрямую — только `ports` и `domain`. Слой `ports` MUST NOT импортировать `adapters`. Слой `domain` MUST NOT импортировать `adapters` и MUST NOT импортировать `reqwest` или `hyper`. Исходящий HTTP-транспорт (`reqwest` / `hyper`) MUST встречаться только в разрешённом исходящем HTTP-адаптере. Адаптеры исходящего IO MAY зависеть от `ports` и `domain` и MUST NOT зависеть от `application`.

#### Scenario: Application does not import adapters
- **WHEN** проверяются исходники слоя `application`
- **THEN** они MUST NOT содержать импорт или inline-путь к `adapters`
- **AND** MUST NOT содержать `reqwest` или `hyper`

#### Scenario: Domain and ports stay free of transport
- **WHEN** проверяются исходники слоёв `domain` и `ports`
- **THEN** они MUST NOT импортировать `adapters`
- **AND** MUST NOT импортировать `reqwest` или `hyper`

#### Scenario: Reqwest stays in the HTTP adapter
- **WHEN** исходящий HTTP выполняется из `underlator-core`
- **THEN** типы HTTP-crate MUST использоваться только внутри исходящего HTTP-адаптера
- **AND** адаптер LLM MUST вызывать унифицированный клиент ядра, а не `reqwest` напрямую

### Requirement: Architecture boundary checks are a test gate
Ядро SHALL проверять границы слоёв автоматически как часть тестового прогона crate. Намеренный запрещённый импорт (например `application` → конкретный исходящий адаптер) MUST делать этот прогон неуспешным. Проверка MUST покрывать и `use`, и qualified/inline пути, а не только текстовый rustdoc-запрет.

#### Scenario: Forbidden application-to-adapter import fails tests
- **WHEN** в слой `application` добавляют импорт исходящего адаптера (Ollama или filesystem) в обход ports
- **THEN** тестовый прогон ядра MUST завершиться неуспехом
- **AND** MUST сообщить о нарушении границы слоёв

#### Scenario: Clean layout passes the gate
- **WHEN** слои соблюдают правила импорта и прогоняются тесты ядра
- **THEN** архитектурная проверка MUST пройти
- **AND** существующие unit-тесты use-cases / провайдера / HTTP MUST остаться зелёными без смены наблюдаемого поведения MVP

### Requirement: Public API remains reachable from composition root
Ядро SHALL реэкспортировать типы и сервисы MVP с composition root так, чтобы host-код мог вызывать application/ports API без знания внутренней раскладки папок. Переезд MUST NOT требовать смены JSON-контракта DTO и MUST NOT менять семантику generate / catalog / chat.

#### Scenario: Host can name core types after the move
- **WHEN** host-crate обращается к публичным типам ядра (сервисы use-cases, ports, DTO, HTTP-клиент, ошибки)
- **THEN** они MUST быть достижимы через публичный API crate
- **AND** сериализация DTO MUST сохранить JSON-ключи контракта атома 1.2

### Requirement: Host crates are driving adapters only
`underlator-server` и `underlator-tauri` SHALL оставаться driving adapters: разбор входа → вызов application/ports API core → сериализация/emit. Они MUST NOT дублировать доменные правила, MUST NOT ходить к LLM HTTP в обход core и MUST NOT получать MVP routes/commands из этого атома.

#### Scenario: Hosts stay thin after the layout change
- **WHEN** атом 2.4 завершён
- **THEN** `underlator-server` не объявляет MVP HTTP routes `model` / `catalog` / `chat`
- **AND** `underlator-tauri` не объявляет MVP Tauri commands этих поверхностей
- **AND** исходники hosts MUST NOT содержать копию use-case логики generate/CRUD чата/выборки каталога

### Requirement: Layout change does not add out-of-scope product work
Этот атом MUST ограничиться раскладкой, границами импортов и тестовым gate. Он MUST NOT добавлять Axum routes, Tauri commands, React `BackendClient`, RAG, выпил Electron и MUST NOT менять бизнес-правила MVP use-cases.

#### Scenario: No host UI RAG or new MVP behavior
- **WHEN** атом 2.4 завершён
- **THEN** `electron-app/` и `react-app/` остаются без обязательных правок
- **AND** публичный crate ядра по-прежнему не зависит от `tauri` и `axum`
- **AND** наблюдаемое поведение generate / catalog / chat / Ollama MUST совпасть с атомом 2.3
