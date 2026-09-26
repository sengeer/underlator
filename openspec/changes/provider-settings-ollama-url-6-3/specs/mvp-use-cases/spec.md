# Spec Delta

## ADDED Requirements

### Requirement: Model and catalog use-cases honor request provider URL
Use-cases `model.list` / `model.install` / `model.remove` и локальный список внутри `catalog.get` / `catalog.search` / `catalog.getModelInfo` SHALL использовать base URL (и provider id) из полей запроса, когда они заданы и непусты. Если `id`/`url` в запросе отсутствуют, use-case MUST использовать провайдер wiring host-процесса. Операция `model.stop` MUST продолжать действовать на process-scoped экземпляре провайдера активного generate. Новая логика MUST жить в hex-слоях (`domain` / `ports` / `application` / `adapters/out`), без плоских модулей у корня `src/`.

#### Scenario: List uses request url over process default
- **WHEN** `model.list` вызывается с непустым `url`, отличным от URL process wiring
- **THEN** исходящий list MUST идти к base URL из запроса через абстракцию LLM-провайдера
- **AND** MUST NOT игнорировать явный `url` запроса в пользу только env host

#### Scenario: Install and remove follow request url
- **WHEN** `model.install` или `model.remove` вызываются с `url` из UI settings
- **THEN** операция MUST выполняться против этого base URL
- **AND** при успехе install MUST отдавать progress и `{ "success": true }`, remove — `{ "success": true }`

#### Scenario: Catalog local merge uses request url when present
- **WHEN** `catalog.get` (или search/getModelInfo, опирающиеся на тот же снимок) получает непустой `url`
- **THEN** локальный inventory MUST читаться с этого URL
- **AND** merge с библиотекой MUST сохранить прежние правила дедупа и fallback

#### Scenario: Omitted url falls back to process provider
- **WHEN** list/install/remove/catalog вызываются без `url` (и без id) в запросе
- **THEN** use-case MUST использовать уже собранный process provider
- **AND** поведение MUST оставаться совместимым с pre-6.3 host wiring

#### Scenario: Stop stays on process generate provider
- **WHEN** идёт generate на process-scoped провайдере и вызывается stop
- **THEN** stop MUST отменить этот generate
- **AND** ephemeral/override URL для list/install/remove MUST NOT ломать stop активного generate
