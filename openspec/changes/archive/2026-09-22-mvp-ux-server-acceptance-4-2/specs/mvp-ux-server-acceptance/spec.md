# Spec Delta

## Purpose

Доказывает dual-mode на web-пути: React в HTTP-режиме против `underlator-server` и Ollama закрывает MVP-контракт `model` / `catalog` / `chat` end-to-end, без RAG/PDF и без desktop-host Tauri.

## ADDED Requirements

### Requirement: Server-mode stand is reproducible
Репозиторий SHALL позволять поднять web-стенд: `docker compose` с сервисами server и Ollama плюс React в HTTP-режиме. Канонический стенд MUST отдавать SPA и `/api/*` с одного origin (порт server). Для разработки UI MUST быть документирован HTTP-клиент через `VITE_BACKEND_MODE=http`, `VITE_BACKEND_URL` и опциональный `VITE_BACKEND_TOKEN`. Если server требует shared secret на `/api/*`, клиент MUST передавать тот же секрет (Bearer), иначе стенд MUST NOT считаться поднятым. `GET /healthz` MUST отвечать успешно при живом server без модели.

#### Scenario: Compose brings server and Ollama
- **WHEN** оператор выполняет `docker compose` из репозитория (файл `docker/docker-compose.yml`)
- **THEN** MUST подняться сервис server и sidecar Ollama
- **AND** server MUST использовать base URL Ollama sidecar, а не `127.0.0.1` внутри контейнера server
- **AND** `GET /healthz` на опубликованном порту server MUST быть успешным

#### Scenario: React talks HTTP with documented env
- **WHEN** оператор запускает React против стенда в HTTP-режиме
- **THEN** MUST быть задано `VITE_BACKEND_MODE=http` либо runtime detect MUST выбрать HTTP (нет Electron/Tauri)
- **AND** base URL MUST быть `VITE_BACKEND_URL` (пусто = same-origin)
- **AND** при включённом секрете server клиент MUST слать `VITE_BACKEND_TOKEN` (или эквивалент, запечённый в static) на `/api/*`
- **AND** MVP-вызовы MUST NOT идти в `window.electron.model|catalog|chat`

### Requirement: Chat MVP operations pass in web UX
На стенде server-режима оператор SHALL выполнить chat-операции карты MVP: `list`, `create`, `get`, `update`, `delete`, `addMessage`. Каждая операция MUST завершиться успехом с JSON-ключами контракта ядра (`id`, `title`, `messages` для сущности чата). Поверхность MUST быть UI web-режима; если операция не имеет отдельной кнопки в основном виджете, MUST быть допустима эквивалентная UI-поверхность того же `react-app`, ходящая в HTTP-клиент (не Electron). Отсутствие RAG MUST NOT блокировать `delete`.

#### Scenario: List create get and addMessage from chat UI
- **WHEN** оператор открывает web-UI, создаёт чат, видит его в списке, открывает и отправляет пользовательское сообщение
- **THEN** `create` / `list` / `get` / `addMessage` MUST завершиться успехом через HTTP
- **AND** новый чат MUST появиться в списке, а сообщение MUST отобразиться в переписке

#### Scenario: Update chat succeeds on HTTP client path
- **WHEN** оператор обновляет поля чата (например title) через UI-поверхность, которая вызывает HTTP-клиент
- **THEN** `update` MUST вернуть сущность с изменёнными полями
- **AND** последующий `get` MUST показать те же поля

#### Scenario: Delete chat is not blocked by missing RAG
- **WHEN** оператор удаляет чат в web-режиме, где RAG IPC недоступен
- **THEN** `delete` MUST завершиться успехом
- **AND** чат MUST исчезнуть из списка
- **AND** MUST NOT требоваться успешный вызов `rag.*`

### Requirement: Model generate stop list install and remove pass
На стенде SHALL пройти операции `model`: потоковая генерация, остановка, список установленных, установка с progress и удаление. Generate MUST идти как SSE (`model:generate-progress`, финал `result`), не WebSocket. Install MUST показывать progress (`model:install-progress`) до успеха. `stop` MUST прекратить выдачу новых успешных токенов активной генерации. Живая модель Ollama MUST быть доступна для generate (после `install` или уже установленная).

#### Scenario: Generate streams then completes
- **WHEN** оператор запускает generate в web-UI против установленной модели Ollama
- **THEN** UI MUST получать кадры потока (текст растёт)
- **AND** операция MUST завершиться финальным текстом из HTTP/SSE, без Electron IPC
- **AND** MUST NOT открываться WebSocket для прогресса

#### Scenario: Stop cancels in-flight generate
- **WHEN** идёт активный generate и оператор нажимает stop
- **THEN** клиент MUST вызвать `model.stop` по HTTP
- **AND** новые успешные токены MUST перестать появляться
- **AND** UI MUST выйти из состояния «идёт генерация»

#### Scenario: List install progress and remove
- **WHEN** оператор в web-UI ставит модель через Ollama, наблюдает progress, затем смотрит список и удаляет модель
- **THEN** install MUST дойти до успеха с кадрами progress
- **AND** `list` MUST содержать установленную модель после install и MUST NOT содержать её после remove

### Requirement: Catalog get search and model info pass
На стенде SHALL пройти `catalog.get`, `catalog.search` и `catalog.getModelInfo`. Успешный снимок MUST содержать ключи контракта (`ollama`, `totalCount`, `lastUpdated`). `getModelInfo` известной модели MUST вернуть карточку; для заведомо отсутствующего имени MUST вернуть отсутствие (JSON `null` / пустой результат клиента), а не сбой «не найдено» как 404-ошибку UX.

#### Scenario: Catalog snapshot and search
- **WHEN** оператор открывает управление моделями / каталог в web-UI
- **THEN** `get` MUST загрузить снимок каталога
- **AND** `search` по строке MUST сузить список без ошибки транспорта

#### Scenario: Get model info known and missing
- **WHEN** оператор запрашивает info существующей карточки и заведомо неизвестного имени
- **THEN** известное имя MUST дать карточку с ключами контракта (`name` / `displayName` или эквивалент карты)
- **AND** неизвестное имя MUST дать отсутствие модели, а не фатальную ошибку HTTP 404 как единственный исход

### Requirement: Contract mismatches are recorded and aligned
Если сценарий падает из-за расхождения JSON/SSE между TypeScript-клиентом и Rust (ключи DTO, имена SSE-событий, тело ошибки `{ class, message }`, финал `result`), команда SHALL зафиксировать баг и выровнять контракт точечным фиксом. Фикс MUST быть минимальным (клиент, host-сериализация или имя поля) и MUST NOT вводить новые use-cases, новые маршруты вне карты MVP или смену SSE на WebSocket. Сценарий MUST быть повторён после фикса. Падение по причине стенда (Ollama недоступна, нет диска) MUST отличаться в отчёте от бага контракта.

#### Scenario: JSON key mismatch is fixed not waived
- **WHEN** UI/клиент не может разобрать успешный ответ server из-за иного JSON-ключа, чем в типах TS / DTO ядра
- **THEN** расхождение MUST быть записано в отчёт приёмки
- **AND** MUST быть внесён точечный фикс, чтобы ключи совпали
- **AND** затронутый сценарий MUST пройти повторно
- **AND** MUST NOT появиться новый use-case или WebSocket-транспорт

#### Scenario: SSE event name mismatch is aligned
- **WHEN** поток generate/install не доставляет progress или финал, потому что имя SSE-события на server и ожидание клиента различны
- **THEN** имена MUST быть выровнены с картой ядра (`model:generate-progress` / `model:install-progress` / `result`)
- **AND** сценарий потока MUST пройти после фикса

### Requirement: Acceptance report records pass or fail
Change SHALL содержать короткий отчёт приёмки со статусом каждого обязательного сценария (`pass` / `fail` / `blocked`). Отчёт MUST жить в `openspec/changes/mvp-ux-server-acceptance-4-2/ACCEPTANCE.md`. Change MUST NOT считаться выполненным, пока обязательные сценарии `chat` / `model` / `catalog` не имеют `pass` (или явный `blocked` с внешней причиной стенда, не из-за непройденного контракта без фикса). RAG/PDF сценарии MUST NOT быть обязательными строками отчёта.

#### Scenario: Report lists all MVP scenarios
- **WHEN** приёмка 4.2 завершена
- **THEN** `ACCEPTANCE.md` MUST существовать в каталоге change
- **AND** MUST содержать строки для list/create/get/update/delete/addMessage, generate/stop/list/install/remove, catalog get/search/getModelInfo
- **AND** каждая строка MUST иметь статус `pass`, `fail` или `blocked`
- **AND** MUST NOT требовать строк RAG или PDF

### Requirement: Change stays inside the server UX acceptance atom
Этот атом MUST ограничиться стендом server/docker, приёмкой UX MVP, точечными фиксами контракта и отчётом. Он MUST NOT реализовывать Tauri host commands, MUST NOT удалять `ElectronTransport` или `electron-app`, MUST NOT переписывать `BackendClient` как слой, MUST NOT менять progress на WebSocket, MUST NOT вводить multi-user IAM, MUST NOT реализовывать RAG/splash runtime и MUST NOT рефакторить UI/FSD вне дыр, из-за которых сценарий падает. Новые use-cases в `underlator-core` запрещены.

#### Scenario: Desktop host and electron stay untouched as goals
- **WHEN** атом 4.2 завершён
- **THEN** `underlator-tauri` MUST NOT объявлять MVP commands этого атома
- **AND** `ElectronTransport` и `electron-app/` MUST остаться
- **AND** progress generate/install MUST остаться SSE
- **AND** маршруты `rag.*` / `splash.*` MUST NOT появиться на server
