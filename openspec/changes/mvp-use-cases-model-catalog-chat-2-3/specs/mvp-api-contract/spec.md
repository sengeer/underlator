# Spec Delta

## MODIFIED Requirements

### Requirement: Contract change does not implement use-cases or other hosts
Типы запросов, ответов и progress-событий MVP SHALL оставаться payload-контрактом исполняемых use-cases `model` / `catalog` / `chat`. Use-cases MUST принимать и возвращать эти типы без переименования JSON-ключей. Этот атом MUST NOT добавлять Axum routes, Tauri commands или React `BackendClient`; обёртка транспорта по-прежнему на стороне host.

#### Scenario: Types without runtime behavior
- **WHEN** выполняется generate, `catalog.get` или `chat.create`
- **THEN** вход и выход MUST использовать существующие contract DTO (смысл полей и JSON-ключи без переименования)
- **AND** `electron-app/` and `react-app/` remain unmodified as a requirement of this change
- **AND** `underlator-server` and `underlator-tauri` do not gain HTTP routes or Tauri commands for the MVP API from this change
