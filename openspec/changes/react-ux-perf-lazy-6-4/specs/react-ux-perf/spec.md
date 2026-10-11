# Spec Delta

## Purpose

Убирает UI-freeze при открытии settings, длинных popup-списков и chat: каталог моделей грузится только по «manage models», списки раскрываются порциями после открытия, chat CRUD через BackendClient остаётся прежним.

## ADDED Requirements

### Requirement: Settings open stays free of the model catalog
Открытие секции settings SHALL NOT инициировать загрузку каталога моделей и списка установленных моделей и SHALL NOT монтировать тяжёлый список manage-models, пока пользователь явно не открыл «manage models». Повторный заход в settings при том же provider id и `url` и без этого открытия MUST NOT запускать тяжёлый повторный sync каталога. Поля API configuration (provider `Ollama`, видимый `url`, вход «manage models») MUST оставаться на месте.

#### Scenario: Opening settings does not fetch the catalog
- **WHEN** пользователь открывает settings и не нажимает «manage models»
- **THEN** из-за этого открытия MUST NOT уходить запрос каталога или списка установленных моделей
- **AND** экран settings MUST становиться интерактивным без заметного freeze на время такого запроса

#### Scenario: Repeated settings visits do not resync
- **WHEN** пользователь несколько раз закрывает и снова открывает settings, не меняя `url` и не открывая «manage models»
- **THEN** MUST NOT выполняться повторный тяжёлый sync каталога на каждый заход

#### Scenario: API configuration from atom 6.3 stays visible
- **WHEN** пользователь открывает settings при активном провайдере `Ollama`
- **THEN** MUST быть видимы селектор provider, поле `url` и вход «manage models»
- **AND** runtime-список провайдеров MUST по-прежнему содержать `Ollama` и MUST NOT предлагать Embedded Ollama

### Requirement: Model catalog loads on manage models open
Каталог и связанные list-запросы manage-models SHALL стартовать при открытии попапа «manage models» или при явном действии внутри него (поиск, установка, удаление), с base URL и provider id текущего `Ollama` из settings. Повторное открытие попапа при том же url и без установки/удаления MUST показывать годный кэш и MUST NOT делать принудительное полное обновление только потому, что попап открыли снова. Смена `url` MUST делать предыдущий снимок негодным: следующий запрос MUST идти на новый url.

#### Scenario: First open uses the settings url
- **WHEN** пользователь открывает «manage models», и для текущего url нет годного кэша каталога
- **THEN** запрос каталога MUST уйти с url и provider id из settings
- **AND** отдельный провайдер Embedded Ollama для этого запроса MUST NOT требоваться

#### Scenario: Same url reuses the cache
- **WHEN** пользователь снова открывает «manage models» с тем же url и без install/remove с прошлого снимка
- **THEN** UI MUST показать закэшированный каталог
- **AND** принудительный тяжёлый refresh MUST NOT быть обязательным условием этого открытия

#### Scenario: Url change applies on the next manage models use
- **WHEN** пользователь меняет `url` в settings и после этого открывает «manage models»
- **THEN** запрос каталога MUST использовать новый url и provider id
- **AND** снимок предыдущего url MUST NOT показываться как актуальный каталог

#### Scenario: Install and remove refresh the open catalog
- **WHEN** пользователь устанавливает или удаляет модель в открытом «manage models»
- **THEN** каталог MUST обновиться так, чтобы состояние installed соответствовало результату
- **AND** этот запрос MUST нести текущий url и provider id из settings

### Requirement: Popup lists reveal after the open transition
Длинный список внутри popup SHALL NOT монтироваться целиком в кадр открытия или закрытия. Оболочка попапа MUST появляться до тяжёлого содержимого. Тяжёлые элементы MUST монтироваться после анимации открытия и далее порциями, а не всем каталогом сразу. Короткие списки (язык, провайдер) MAY рендериться сразу.

#### Scenario: Manage models paints the shell before the full catalog
- **WHEN** пользователь открывает «manage models», и каталог длиннее одного экрана
- **THEN** кадр открытия MUST показать оболочку попапа до монтирования всего списка
- **AND** весь каталог MUST NOT оказываться в дереве в том же кадре, что и старт открытия

#### Scenario: Closing the popup does not lay out the whole catalog
- **WHEN** пользователь закрывает popup с длинным списком
- **THEN** закрытие MUST завершаться без синхронной раскладки всего каталога в одном кадре

#### Scenario: Other popups stay smooth
- **WHEN** пользователь открывает и закрывает другие popup’ы settings (язык, провайдер, донат — те, что уже есть на экране)
- **THEN** открытие и закрытие MUST оставаться плавными
- **AND** эти короткие списки MUST NOT ждать порционной подгрузки каталога моделей

### Requirement: Chat uses the same progressive reveal
Список чатов при открытии sidebar и старая часть истории при переключении диалога SHALL раскрываться той же порционной логикой, что и длинные списки popup. Недавний хвост истории и индикатор текущей генерации MUST быть видны сразу. Операции chat `list` / `create` / `get` / `update` / `delete` / `addMessage` MUST по-прежнему идти через `BackendClient` с прежним JSON-контрактом.

#### Scenario: Opening the chat sidebar reveals rows in portions
- **WHEN** пользователь открывает sidebar, и чатов больше, чем помещается на один экран
- **THEN** все строки списка MUST NOT монтироваться в одном кадре
- **AND** создание, выбор и удаление чата MUST оставаться доступными

#### Scenario: Switching chats keeps the recent tail immediate
- **WHEN** пользователь переключает диалог с длинной историей сообщений
- **THEN** недавние сообщения и индикатор генерации MUST отображаться без ожидания всей истории
- **AND** более старые сообщения MUST появляться порциями

#### Scenario: Chat CRUD stays on BackendClient
- **WHEN** пользователь создаёт чат, открывает его, меняет, удаляет или добавляет сообщение
- **THEN** операция MUST выполняться через `BackendClient`
- **AND** этот атом MUST NOT менять JSON-ключи chat-контракта

### Requirement: Change stays inside React UX performance
Атом MUST ограничиваться узкими правками отзывчивости React UI и общей порционной логикой списков. Он MUST NOT удалять Electron, `ElectronTransport` или `electron-app`. Он MUST NOT возвращать RAG UI или splash UI и MUST NOT снимать маркеры `TODO(rag)` и `TODO(splash)`. Он MUST NOT возвращать Embedded Ollama или ollama-manager, MUST NOT реализовывать полные адаптеры OpenRouter/Claude, MUST NOT переписывать FSD, settings или `BackendClient` заново и MUST NOT менять `underlator-core`, Tauri host или server, пока jank устраняется на фронте.

#### Scenario: Prior atoms stay conserved
- **WHEN** оптимизация 6.4 внесена
- **THEN** маркеры `TODO(rag)` и `TODO(splash)` MUST оставаться на законсервированных входных точках
- **AND** Electron-транспорт и `electron-app` MUST оставаться в репозитории
- **AND** продуктовый провайдер MVP MUST оставаться `Ollama` с видимым `url` и «manage models» по этому url
