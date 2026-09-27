# Spec Delta

## ADDED Requirements

### Requirement: BackendClient passes provider url for manage-models operations
Публичный `BackendClient.model` SHALL принимать provider config (`id` / `url`) для операций `list`, `install` и `remove` (отдельным аргументом и/или полями в теле запроса, согласованными с DTO ядра). Вызовы `catalog.get` / `search` / `getModelInfo` из manage-models path MUST также прокидывать тот же config, когда url задан в settings. Транспорты HTTP / Tauri / Electron MUST сериализовать эти поля в host без отбрасывания. Hardcoded `Embedded Ollama` на границе клиента MUST NOT использоваться.

#### Scenario: List install remove include settings url
- **WHEN** settings содержат `Ollama` с url `http://127.0.0.1:11434` и id `ollama`, и UI вызывает list/install/remove через `BackendClient`
- **THEN** исходящий запрос MUST содержать этот `url` и `id` (или эквивалент контракта)
- **AND** MUST NOT подставлять Embedded Ollama как provider id

#### Scenario: Catalog manage-models path forwards url
- **WHEN** manage models загружает каталог через `BackendClient.catalog`
- **THEN** клиент MUST передать url (+ id) из активных provider settings, если они заданы
- **AND** виджеты MUST NOT импортировать транспорты напрямую (как и прежде)
