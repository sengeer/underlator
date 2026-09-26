# Spec Delta

## MODIFIED Requirements

### Requirement: Desktop StorageRoot uses app data directory
Host SHALL задавать `StorageRoot` для `FilesystemChatStore` (или эквивалентного адаптера ядра) через каталог данных desktop-приложения (app data dir платформы / конфиг host). Путь MUST NOT быть захардкоженным server/docker-путём вроде `/data`. Провайдер для **generate/`stop`** на старте MUST собираться один раз через factory ядра (как у server): поля `id`/`url` в теле generate MUST NOT создавать второй process-scoped клиент, ломающий `stop`. Для **list / install / remove / catalog** host MUST прокидывать `id`/`url` из invoke в core; при явном `url` в запросе process env URL MUST NOT быть единственным источником истины.

#### Scenario: Chats persist under desktop data dir
- **WHEN** desktop host стартует и создаёт/читает чат через MVP commands
- **THEN** файлы чатов MUST лежать под `StorageRoot`, указывающим на desktop app data dir (или явно заданный desktop override)
- **AND** MUST NOT требовать volume `/data` docker-compose для работы desktop chat store

#### Scenario: Single provider instance for stop
- **WHEN** host выполняет wiring на старте
- **THEN** `ModelService` generate/`stop` MUST разделять один `Arc` провайдера процесса
- **AND** поля `id`/`url` в теле generate MUST NOT создавать второй process-scoped клиент провайдера в host, из-за которого `stop` теряет активный generate

#### Scenario: Manage-models invoke forwards UI url
- **WHEN** frontend вызывает `model_list` / `model_install` / `model_remove` (или catalog commands) с `url` из settings
- **THEN** host MUST передать `url` (+ `id`) в core
- **AND** MUST NOT игнорировать явный url в пользу только process env
