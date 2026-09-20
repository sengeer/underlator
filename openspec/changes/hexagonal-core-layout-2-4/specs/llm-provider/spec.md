# Spec Delta

## ADDED Requirements

### Requirement: Provider port and adapters occupy hex layers
Абстракция LLM-провайдера SHALL жить в слое `ports`. Runtime-адаптер локального Ollama и stubs облачных id SHALL жить в `adapters/out`. Factory/реестр по `provider_id` SHALL собираться в composition root или в исходящем адаптерном слое, а не в `application`. Слой `application` MUST вызывать только port и MUST NOT импортировать конкретный Ollama-адаптер.

#### Scenario: Trait is independent of Ollama module
- **WHEN** проверяется раскладка провайдера после атома 2.4
- **THEN** определение абстракции провайдера MUST находиться в `ports/`
- **AND** исходники runtime Ollama MUST находиться под `adapters/out/`
- **AND** use-case `model` MUST NOT импортировать тип runtime Ollama напрямую

#### Scenario: Factory remains host-facing wiring
- **WHEN** host создаёт провайдера по `provider_id` `ollama`
- **THEN** результат MUST быть исполняемым адаптером Ollama через публичный API crate
- **AND** код `application` MUST NOT содержать эту factory как обязательную зависимость use-case
