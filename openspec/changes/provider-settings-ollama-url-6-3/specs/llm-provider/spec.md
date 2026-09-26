# Spec Delta

## MODIFIED Requirements

### Requirement: Registry selects provider by id
Ядро SHALL выбирать реализацию провайдера по `provider_id` из конфига. Идентификатор `ollama` MUST резолвиться в runtime-адаптер Ollama. Идентификатор `embedded-ollama` MUST оставаться alias того же runtime-адаптера Ollama для back-compat (миграция persist / старые payload), но продуктовый UI MUST NOT требовать отдельного Embedded-провайдера. Неизвестный id MUST давать классифицированную ошибку, а не молча подменять вендора.

#### Scenario: ollama id resolves to runtime adapter
- **WHEN** factory/реестр получает `provider_id` `ollama` или `embedded-ollama` и валидный `url`
- **THEN** результат MUST быть исполняемым адаптером Ollama
- **AND** последующий list/generate MUST быть возможен без другого `provider_id`

#### Scenario: Unknown provider id fails closed
- **WHEN** factory/реестр получает неизвестный `provider_id`
- **THEN** создание провайдера MUST завершиться ошибкой unknown provider
- **AND** MUST NOT выполнить исходящий HTTP

#### Scenario: Product default id is ollama not Embedded
- **WHEN** вызывающий код задаёт локальный MVP-провайдер без legacy id
- **THEN** `provider_id` MUST быть `ollama`
- **AND** MUST NOT требоваться отдельный продуктовый id Embedded Ollama для list/install/remove
