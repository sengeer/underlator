# Spec Delta

## MODIFIED Requirements

### Requirement: Model contract types mirror preload
The core library SHALL expose serializable request and response types whose meaning matches the Electron preload `model` surface: `generate` (request + provider config), `stop`, `install`, `remove`, and `list`.

#### Scenario: Generate request and unary result
- **WHEN** a host serializes a generate call
- **THEN** the payload MUST include required fields `model` and `prompt`, optional generation fields equivalent to the current Ollama generate request (`system`, `temperature`, `max_tokens`, `num_predict`, `think`, `context`), and the provider config fields `id` and `url`
- **AND** the unary completion payload MUST be the concatenated generated text (string), equivalent to the current invoke result data

#### Scenario: Install, remove, list, and stop payloads
- **WHEN** a host serializes install, remove, list, or stop
- **THEN** install MUST use a request with required `name` and optional `tag`, `registry`, `insecure`, and optional provider config fields `id` and `url`
- **AND** remove MUST use a request with required `name` and optional provider config fields `id` and `url`
- **AND** list MUST accept a request that MAY include provider config fields `id` and `url` (empty/omitted fields mean host process default) and MUST return a response with a `models` array whose items include `name`, `size`, and `modified_at`
- **AND** stop MUST have an empty request body
- **AND** install and remove unary results MUST include a boolean `success` field

#### Scenario: Manage-models requests carry UI base URL
- **WHEN** frontend manage models sends list, install, or remove against a user-configured Ollama base URL
- **THEN** the serialized request MUST be able to include that `url` (and provider `id`) so hosts are not limited to process env as the only source of truth
- **AND** JSON keys for provider config MUST remain `id` and `url` (no rename required on React)

## ADDED Requirements

### Requirement: Catalog requests MAY carry provider base URL for local merge
Типы запросов `catalog.get` / `catalog.search` / `catalog.getModelInfo` SHALL допускать опциональные поля provider config `id` и `url` (или эквивалентный вложенный конфиг с теми же JSON-ключами), чтобы локальный merge списка установленных моделей мог использовать base URL из UI. При отсутствии полей MUST сохраняться поведение host process default. Смысл остальных полей каталога MUST NOT меняться.

#### Scenario: Catalog get with explicit url
- **WHEN** клиент вызывает `catalog.get` с `url` из settings и опциональным `id`
- **THEN** payload MUST сериализоваться с ключами `id`/`url` без переименования
- **AND** при отсутствии `id`/`url` запрос MUST оставаться совместимым с прежним телом (`forceRefresh` и т.д.)
