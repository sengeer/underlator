# Spec Delta

## MODIFIED Requirements

### Requirement: Host crates are driving adapters only
`underlator-server` и `underlator-tauri` SHALL оставаться driving adapters: разбор входа → вызов application/ports API core → сериализация/emit. Они MUST NOT дублировать доменные правила и MUST NOT ходить к LLM HTTP в обход core. После атома 3.1 `underlator-server` SHALL смапить MVP HTTP-маршруты `model` / `catalog` / `chat` на use-cases ядра. После атома desktop-host 5.1 `underlator-tauri` SHALL смапить MVP Tauri commands и progress events тех же поверхностей на use-cases ядра без доменной логики в host и без прямого `reqwest`/Ollama в tauri crate.

#### Scenario: Hosts stay thin after the layout change
- **WHEN** inbound HTTP обрабатывает `underlator-server` или inbound IPC обрабатывает `underlator-tauri`
- **THEN** handlers/commands MUST вызывать application/ports API ядра, а не копировать логику generate / CRUD чата / выборки каталога
- **AND** исходники `underlator-server` MUST NOT содержать исходящий вызов Ollama в обход core (`reqwest` / вендорный URI `/api/generate`)
- **AND** исходники `underlator-tauri` MUST NOT содержать исходящий вызов Ollama в обход core

#### Scenario: Tauri maps MVP surfaces after desktop-host atom
- **WHEN** атом 5.1 завершён
- **THEN** `underlator-tauri` MUST объявлять MVP Tauri commands `model` / `catalog` / `chat` по карте ядра
- **AND** progress generate/install MUST эмититься событиями ядра без дублирования доменных правил в host
