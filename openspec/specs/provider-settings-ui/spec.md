# provider-settings-ui Specification

## Purpose
Приводит API configuration в `react-app` к модели rust-core: один MVP-провайдер `Ollama` с видимым base URL и manage models по этому URL, без продуктового Embedded Ollama / ollama-manager.

## Requirements

### Requirement: API configuration exposes Ollama url and manage models
Секция **API configuration** в settings SHALL показывать для активного провайдера `Ollama`: селектор **provider**, поле **url** (base URL) и вход **manage models**. Manage models MUST быть доступен для `Ollama`, а не только для бывшего Embedded. Layout/`switch(provider)` MUST допускать будущие пункты (OpenRouter, Claude и т.п.) без переписывания всей секции, но runtime-список MVP MUST содержать только `Ollama`.

#### Scenario: Ollama shows url and manage models
- **WHEN** пользователь открывает settings и активный провайдер — `Ollama`
- **THEN** MUST быть видимы поле url (ввод base URL) и контроль manage models
- **AND** клик manage models MUST открывать существующий manage-models UX

#### Scenario: Provider list is extensible but MVP runtime is Ollama only
- **WHEN** пользователь открывает селектор provider в MVP
- **THEN** в runtime-списке MUST быть `Ollama`
- **AND** MUST NOT быть пункта `Embedded Ollama`
- **AND** структура списка/`switch(provider)` MUST NOT требовать переписывания layout для добавления будущего облачного провайдера отдельным change

### Requirement: Embedded Ollama is removed from product UI and types
Продуктовая поверхность SHALL NOT предлагать провайдер `Embedded Ollama`. Тип `ProviderType`, константа `PROVIDERS`, default provider, Redux `provider-settings-slice`, ветки UI «только для Embedded», hardcoded `provider: 'Embedded Ollama'` в manage-models thunks и пользовательские i18n/упоминания Embedded как отдельного провайдера MUST быть убраны или нормализованы. Специальная macOS production-ветка «оставить только Embedded» MUST NOT восстанавливать Embedded.

#### Scenario: No Embedded Ollama in selector or defaults
- **WHEN** приложение стартует с чистым state или пользователь открывает provider selector
- **THEN** default provider MUST быть `Ollama`
- **AND** MUST NOT отображаться и не выбираться `Embedded Ollama` как отдельный runtime-провайдер

#### Scenario: Manage-models thunks use active Ollama settings
- **WHEN** пользователь устанавливает или удаляет модель через manage models
- **THEN** обновление settings MUST писать в активного провайдера `Ollama` (актуальный provider id + model)
- **AND** MUST NOT hardcode `provider: 'Embedded Ollama'`

### Requirement: Persisted Embedded Ollama migrates to Ollama
При загрузке сохранённых settings (redux-persist / localStorage) значение провайдера `Embedded Ollama` SHALL нормализоваться в `Ollama`. Поля `model` и `url` MUST сохраняться по возможности; provider id `embedded-ollama` MUST нормализоваться в `ollama`.

#### Scenario: Hydrate renames Embedded to Ollama
- **WHEN** в persist лежал `provider: 'Embedded Ollama'` с url и model
- **THEN** после hydrate активный provider MUST быть `Ollama`
- **AND** url и model MUST совпасть с сохранёнными (если были заданы)
- **AND** id настроек MUST быть `ollama`, а не `embedded-ollama`

### Requirement: Manage models uses settings url and provider id
Все list / install / remove / catalog-запросы из manage-models UX SHALL идти в backend через `BackendClient` с **base URL** и **provider id** из текущих provider settings (поле `url` и id провайдера `Ollama`), а не с hardcoded Embedded и не игнорируя url UI.

#### Scenario: Install hits configured base URL
- **WHEN** в settings для `Ollama` задан url `http://127.0.0.1:11434` и пользователь ставит модель через manage models
- **THEN** клиент MUST передать в backend этот url вместе с provider id `ollama` (или эквивалент контракта)
- **AND** MUST NOT требовать отдельного Embedded Ollama manager

#### Scenario: List and catalog use the same settings url
- **WHEN** manage models загружает список установленных или каталог
- **THEN** запросы MUST использовать тот же url (+ provider id) из settings
- **AND** смена url в settings MUST влиять на последующие manage-models вызовы без возврата Embedded

### Requirement: Cloud provider UI hooks stay stubs without Embedded
Архитектура settings MAY оставлять точки расширения под будущие облачные провайдеры (отдельные поля вроде API key, свой manage/catalog path через тот же `BackendClient`). Этот change MUST NOT реализовывать полные адаптеры OpenRouter/Claude и MUST NOT возвращать Embedded Ollama / ollama-manager как способ «локального» manage models.

#### Scenario: No cloud adapters and no Embedded return
- **WHEN** атом 6.3 завершён
- **THEN** runtime MVP MUST работать с одним локальным `Ollama` + url + manage models
- **AND** MUST NOT появиться продуктовый Embedded Ollama
- **AND** MUST NOT появиться полная реализация OpenRouter/Claude как обязательный DoD
