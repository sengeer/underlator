# Spec Delta

## MODIFIED Requirements

### Requirement: Host crates are driving adapters only
`underlator-server` и `underlator-tauri` SHALL оставаться driving adapters: разбор входа → вызов application/ports API core → сериализация/emit. Они MUST NOT дублировать доменные правила и MUST NOT ходить к LLM HTTP в обход core. После атома 3.1 `underlator-server` SHALL смапить MVP HTTP-маршруты `model` / `catalog` / `chat` на use-cases ядра. `underlator-tauri` MUST NOT получать MVP commands этих поверхностей, пока не выполнен атом desktop-host.

#### Scenario: Hosts stay thin after the layout change
- **WHEN** атом 2.4 завершён и inbound HTTP обрабатывает `underlator-server`
- **THEN** handlers MUST вызывать application/ports API ядра, а не копировать логику generate / CRUD чата / выборки каталога
- **AND** исходники `underlator-server` MUST NOT содержать исходящий вызов Ollama в обход core (`reqwest` / вендорный URI `/api/generate`)
- **AND** `underlator-tauri` MUST NOT объявлять MVP Tauri commands этих поверхностей
