# Spec Delta

## MODIFIED Requirements

### Requirement: Tauri transport is a typed client skeleton
SHALL существовать типизированный Tauri-транспорт, чьи имена команд и событий MUST совпадать с картой ядра (`model_generate`, `model_stop`, … `chat_add_message`; события `model:generate-progress` / `model:install-progress`). После атома desktop-host 5.1 транспорт MUST выполнять рабочие `invoke` и `listen` против живого `underlator-tauri` (аргументы и ошибки согласованы с host), без silent fallback на Electron/HTTP. Отсутствие Tauri runtime или незарегистрированной команды MUST по-прежнему завершаться явной ошибкой, а не обращением к другому транспорту внутри `TauriTransport`.

#### Scenario: Tauri command names follow the core map
- **WHEN** разработчик инспектирует Tauri-транспорт
- **THEN** каждая из 14 MVP-операций MUST отображаться на `tauri_command` из карты ядра
- **AND** progress MUST слушаться по IPC-именам событий ядра

#### Scenario: Live host invoke succeeds without HTTP fallback
- **WHEN** выбран Tauri-транспорт, runtime доступен и host зарегистрировал MVP commands
- **THEN** унарные операции и generate/install MUST идти через `invoke` / events host
- **AND** `TauriTransport` MUST NOT выполнять `fetch` к `/api/model|catalog|chat` и MUST NOT вызывать `window.electron`

#### Scenario: Unwired host does not fake success
- **WHEN** выбран Tauri-транспорт и runtime invoke недоступен или команда не зарегистрирована
- **THEN** операция MUST завершиться ошибкой
- **AND** MUST NOT маскировать это успешным ответом HTTP или Electron
- **AND** MUST NOT выполнять silent fallback на Electron/HTTP внутри `TauriTransport`

### Requirement: Transport is selected by flag or runtime detect
Выбор транспорта SHALL учитывать явный build/runtime флаг `VITE_BACKEND_MODE` (`http` | `electron` | `tauri`). Если флаг не задан, клиент MUST определить среду: наличие Tauri global → Tauri-транспорт; наличие `window.electron` → Electron-транспорт; иначе HTTP-транспорт. Явный флаг MUST побеждать автоопределение. В desktop-сборке Tauri (когда runtime globals присутствуют и флаг не задан явно иначе) MUST выбираться Tauri-транспорт. Вызывающий код фич MUST получать один и тот же `BackendClient` независимо от выбранного транспорта. `HttpTransport` и `ElectronTransport` MUST оставаться работоспособными для своих режимов.

#### Scenario: Explicit http mode wins
- **WHEN** задано `VITE_BACKEND_MODE=http` даже при наличии `window.electron`
- **THEN** MVP-вызовы MUST идти через HTTP-транспорт
- **AND** MUST NOT вызывать `window.electron.model|catalog|chat` для этих операций

#### Scenario: Electron is detected without flag
- **WHEN** флаг режима пуст и `window.electron` доступен, а Tauri global нет
- **THEN** MUST быть выбран Electron-транспорт

#### Scenario: Tauri is detected without flag
- **WHEN** флаг режима пуст и доступны Tauri runtime globals (`__TAURI_INTERNALS__` и/или `__TAURI__`)
- **THEN** MUST быть выбран Tauri-транспорт
- **AND** MUST NOT быть выбран Electron-транспорт только из-за устаревших глобалей, если Tauri detect сработал первым

#### Scenario: Explicit tauri mode wins
- **WHEN** задано `VITE_BACKEND_MODE=tauri`
- **THEN** MVP-вызовы MUST идти через Tauri-транспорт
- **AND** MUST NOT ходить в HTTP `/api/*` из этого выбора

#### Scenario: Default without hosts is HTTP
- **WHEN** флаг режима пуст и нет ни Tauri global, ни `window.electron`
- **THEN** MUST быть выбран HTTP-транспорт
