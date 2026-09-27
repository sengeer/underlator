# Spec Delta

## ADDED Requirements

### Requirement: Server forwards request provider URL into core
`underlator-server` SHALL прокидывать provider `id`/`url` из HTTP-запроса (body для install/remove/catalog; body или query для list — как зафиксировано в контракте ядра) в use-cases core без отбрасывания. URL из env/process config MUST оставаться fallback, когда поля запроса отсутствуют, и MUST NOT быть единственным источником истины, если клиент передал явный `url`. Host MUST NOT ходить к Ollama в обход core.

#### Scenario: Install body url reaches core
- **WHEN** клиент вызывает `POST /api/model/install` с JSON, содержащим `name` и `url`
- **THEN** host MUST передать оба поля в `ModelService` / application API ядра
- **AND** MUST NOT заменить явный `url` только значением `OLLAMA_BASE_URL` / process config

#### Scenario: List without url uses process default
- **WHEN** клиент вызывает list без `url`
- **THEN** host/core MUST использовать process-scoped provider URL
- **AND** ответ MUST оставаться JSON с массивом `models`
