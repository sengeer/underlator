# Spec Delta

## Purpose

Задаёт воспроизводимую сборку и запуск Tauri desktop Underlator с каноническими релизовыми артефактами (Linux AppImage, macOS arm64 DMG, Windows portable zip), developer-документацией и жёстким приёмочным gate на Fedora Workstation 44 до выпила Electron.

## ADDED Requirements

### Requirement: Canonical desktop release artifact names
Репозиторий SHALL производить (или документировать шаг rename до) релизовые артефакты desktop с каноническими именами, где `<version>` берётся из semver продукта / `tauri.conf` (пример плана: `0.1.0-beta`):

| Платформа | Формат | Каноническое имя |
| --- | --- | --- |
| Linux x86_64 | `.AppImage` | `Underlator-<version>-linux-x86_64.AppImage` |
| macOS Apple Silicon | `.dmg` arm64 | `Underlator-<version>-macos-arm64.dmg` |
| Windows 11 | portable zip (допустимо rar) с `.exe` | `Underlator-<version>-win-x64-portable.zip` |

Обязательный DoD-формат Linux MUST быть **AppImage**; macOS MUST быть **dmg** для **arm64** (не Intel x86_64 в скоупе 5.2); Windows MUST быть **portable** архив с `.exe`. Форматы `.deb`, MSI и NSIS MUST NOT считаться заменой канонических форматов в DoD этого атома.

#### Scenario: Linux AppImage matches canonical name
- **WHEN** на Linux x86_64 выполняется release-сборка desktop host с feature `desktop`
- **THEN** MUST существовать файл `Underlator-<version>-linux-x86_64.AppImage` (напрямую из bundle или после документированного rename)
- **AND** обязательный DoD MUST NOT принимать только `.deb` вместо AppImage

#### Scenario: macOS and Windows canonical names are defined
- **WHEN** документируется или выполняется сборка macOS arm64 / Windows x64
- **THEN** целевые имена MUST быть `Underlator-<version>-macos-arm64.dmg` и `Underlator-<version>-win-x64-portable.zip` (или `.rar` portable с `.exe`)
- **AND** MSI/NSIS MUST NOT заменять portable zip в DoD

### Requirement: Reproducible build and run commands
Проект SHALL документировать и поддерживать воспроизводимую цепочку: сборка `react-app` → `cargo tauri dev` / `cargo tauri build` с feature `desktop` для `underlator-tauri`. Конфигурация Tauri (`tauri.conf.json` и связанные scripts) MUST указывать frontend dist / hooks так, чтобы release-сборка подтягивала собранный UI без ручного «секретного» пути только через ad-hoc `tauri dev`.

#### Scenario: Developer can build desktop from documented commands
- **WHEN** разработчик следует документу desktop Tauri на машине с native prerequisites
- **THEN** MUST существовать явная последовательность команд для `react-app` build и `cargo tauri build` (feature `desktop`)
- **AND** `tauri.conf` MUST ссылаться на frontend dist `react-app` (как в 5.1) с необходимыми beforeBuild/dev hooks

### Requirement: Native prerequisites documented per OS
Документация SHALL перечислять native prerequisites:

- Linux: GTK / WebKitGTK и связанные пакеты; отдельно — зависимости для сборки AppImage на Fedora
- macOS: Xcode Command Line Tools / WebView, target arm64
- Windows 11: WebView2 и build tools, достаточные для portable-сборки

#### Scenario: Fedora AppImage prerequisites are listed
- **WHEN** разработчик читает desktop doc перед сборкой на Fedora
- **THEN** MUST найти список пакетов/deps для Tauri WebView и для AppImage bundling
- **AND** типичные ошибки отсутствующих deps MUST быть описаны кратко

### Requirement: Desktop modes and environment documentation
SHALL существовать короткий документ (например `docs/DESKTOP_TAURI.md` и/или раздел README), который описывает:

- Desktop (Tauri) vs Docker (server) vs (временно) Electron
- переменные окружения `OLLAMA_BASE_URL` и каталог данных (app data dir / `UNDERLATOR_DATA_DIR`)
- как собрать/переименовать каждый канонический артефакт
- матрицу `verified` / `unverified` по ОС (Linux Fedora 44, macOS arm64, Windows 11)

#### Scenario: Modes and env are documented
- **WHEN** клонировавший репозиторий открывает desktop doc
- **THEN** MUST быть ясно, какой host использовать для desktop / docker / Electron
- **AND** MUST быть указаны `OLLAMA_BASE_URL` и data dir override для desktop

#### Scenario: Verification matrix distinguishes verified and unverified
- **WHEN** DoD атома 5.2 фиксируется
- **THEN** матрица MUST пометить Fedora 44 AppImage как обязательный `verified` (после успешного smoke)
- **AND** macOS / Windows MUST быть `verified` только при фактическом smoke на машине, иначе `unverified` с пошаговой инструкцией

### Requirement: Fedora Workstation 44 AppImage acceptance gate
Атом 5.2 SHALL считаться принятым только после жёсткого gate на **Fedora Workstation 44** (без N/A):

1. Собран артефакт `Underlator-*-linux-x86_64.AppImage` с каноническим именем
2. AppImage запускается на этой Fedora
3. UI доступен
4. Живой smoke MVP против **локального Ollama**: `model` (generate/stop как минимум; list/install/remove по чеклисту), `catalog` (get/search/getModelInfo), `chat` (CRUD + persist / addMessage)

`cargo tauri dev`, unit/mock host-тесты атома 5.1 и факт «бинарь/AppImage файл появился» MUST NOT заменять этот gate. Docs + команды для macOS arm64 DMG и Windows portable zip обязательны даже если smoke там `unverified`; это MUST NOT ослаблять Linux AppImage gate.

#### Scenario: AppImage smoke passes on Fedora 44
- **WHEN** валидатор на Fedora Workstation 44 запускает канонический AppImage при работающем локальном Ollama
- **THEN** UI MUST открыться и MVP `model` / `catalog` / `chat` MUST пройти живой smoke (generate/stop, catalog, chat CRUD/persist)
- **AND** атом MUST NOT помечаться принятым, если выполнен только `tauri dev` или unit/mock без AppImage smoke

#### Scenario: Missing Mac or Windows machine does not waive Linux gate
- **WHEN** нет машины для macOS или Windows smoke
- **THEN** соответствующая строка матрицы MUST быть `unverified` с пошаговой инструкцией сборки
- **AND** Linux AppImage gate на Fedora 44 MUST всё равно быть выполнен для приёмки атома

### Requirement: Gate before Electron removal (atom 6.1)
Выпил Electron / `ElectronTransport` / `electron-app` (атом 6.1) MUST NOT начинаться, пока атом 5.2 не закрыт: рабочий канонический AppImage на Fedora Workstation 44 + docs/инструкции для macOS arm64 DMG и Windows portable zip. Атом 5.2 MUST NOT сам удалять Electron.

#### Scenario: Electron remains until 5.2 closed
- **WHEN** выполняется DoD атома 5.2
- **THEN** `electron-app/` и `ElectronTransport` MUST оставаться в репозитории
- **AND** документация MUST явно указывать, что 6.1 запрещён до закрытия Fedora AppImage gate и docs для остальных артефактов

### Requirement: Out of scope surfaces stay untouched
Атом 5.2 MUST NOT: менять бизнес-логику или DTO `underlator-core`; добавлять RAG / splash / embedded Ollama runtime; править `underlator-server` / docker вне крайней дыры контракта; широко рефакторить React/FSD вне нужного для desktop build/run; требовать обязательный CI matrix / release upload артефактов.

#### Scenario: Core DTO and Electron stay intact
- **WHEN** diff атома 5.2 инспектируется
- **THEN** MUST NOT быть смены MVP DTO/use-cases «с нуля» в core
- **AND** MUST NOT быть удаления Electron как части 5.2
- **AND** CI release upload MAY отсутствовать без провала DoD
