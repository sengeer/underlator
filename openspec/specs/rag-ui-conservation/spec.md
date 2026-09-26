# rag-ui-conservation Specification

## Purpose
Консервирует RAG UI в `react-app` для MVP без rust-core RAG: скрывает пользовательские RAG-действия, оставляет код заготовками с `TODO(rag)`, сохраняет стабильность chat / translation / instruction через `BackendClient`.

## Requirements

### Requirement: Chat attach-file entry is hidden in MVP
Виджет чата SHALL NOT рендерить кнопку attach file / upload document в MVP-сборке. Пользователь MUST NOT иметь UI-точку загрузки документов для RAG. Код обработчика upload/process MAY оставаться в исходниках, но MUST быть отключён на входной точке (не рендерится и/или early-return) с маркером `// TODO(rag): ...`.

#### Scenario: Attach file control is not visible
- **WHEN** пользователь открывает активный чат в MVP UI (Tauri или HTTP)
- **THEN** кнопка `attach file` (или эквивалент upload document) MUST NOT отображаться
- **AND** MUST NOT быть другого видимого контроля в чате, запускающего upload/process документа для RAG

#### Scenario: Upload handler is conserved not deleted
- **WHEN** разработчик ищет консервацию attach/upload в исходниках чата
- **THEN** обработчик upload/process (или его эквивалент) MUST оставаться в репозитории либо как закомментированный блок, либо за early-return / feature-flag
- **AND** MUST присутствовать маркер `TODO(rag)` у отключённой входной точки

### Requirement: RAG settings section is hidden in MVP
Экран settings SHALL NOT показывать секцию **RAG configuration** (topK, similarity threshold, chunk size, manage embedding models) в MVP UI. Поля и обработчики MAY оставаться в коде как заготовки с `// TODO(rag): restore RAG settings when rust-core RAG lands` (или эквивалентным `TODO(rag)`).

#### Scenario: RAG configuration is not visible
- **WHEN** пользователь открывает settings в MVP UI
- **THEN** заголовок/секция RAG configuration и связанные поля topK / similarity threshold / chunk size / manage embedding models MUST NOT отображаться
- **AND** MUST NOT быть видимой кнопки, открывающей manage embedding models из этой секции

#### Scenario: RAG settings code is conserved
- **WHEN** разработчик ищет секцию RAG configuration в исходниках settings
- **THEN** разметка/логика секции MUST оставаться в репозитории (comment-out или эквивалентная консервация)
- **AND** MUST присутствовать маркер `TODO(rag)` с указанием на восстановление после появления RAG в rust-core

### Requirement: Embedding-models UI cannot call missing RAG backend
Связанные попапы, режимы manage-models для embedding (`mode='rag'` / `target: 'rag'`) и иные UI-точки установки/удаления embedding-моделей для RAG SHALL NOT оставаться «живыми» кликами в MVP. Они MUST быть скрыты, отключены или early-return с `TODO(rag)`, так чтобы пользователь не мог инициировать RAG/embedding IPC или BackendClient-вызовы, которых нет в rust-core MVP.

#### Scenario: Manage embedding models popup is unreachable
- **WHEN** пользователь находится в settings MVP UI
- **THEN** MUST NOT быть доступного клика, открывающего manage embedding models popup для RAG
- **AND** popup в режиме embedding/RAG MUST NOT быть достижим из основного settings UI

#### Scenario: No live rag install or remove from UI
- **WHEN** MVP UI просматривается без скрытых debug-путей
- **THEN** пользователь MUST NOT иметь возможность запустить install/remove embedding-модели с `target: 'rag'` через видимый UI
- **AND** код веток MAY сохраняться с `TODO(rag)`

### Requirement: Secondary RAG call sites are disabled on MVP path
Вторичные входные точки MVP-пути (загрузка RAG-контекста перед generate в чате, best-effort удаление document collection при delete chat, dev/test UI кнопки RAG) SHALL NOT вызывать отсутствующий RAG backend как обязательный шаг. Они MUST быть законсервированы (early-return no-op / comment-out / feature-flag) с `TODO(rag)`. Удаление чата и генерация без документов MUST продолжать работать.

#### Scenario: Chat generate without documents does not require RAG
- **WHEN** пользователь отправляет сообщение в чате без прикреплённых документов на Tauri/HTTP
- **THEN** генерация MUST идти через `BackendClient.model` без обязательного успешного вызова `rag.*`
- **AND** отсутствие RAG backend MUST NOT блокировать ответ и MUST NOT требовать toast об ошибке RAG как обязательный шаг

#### Scenario: Delete chat is not blocked by RAG conservation
- **WHEN** пользователь удаляет чат в MVP UI
- **THEN** `chat.delete` через `BackendClient` MUST завершаться успешно при отсутствии RAG backend
- **AND** любой вызов удаления document collection MUST быть best-effort / отключён и MUST NOT блокировать delete

### Requirement: Conserved RAG code is discoverable via TODO markers
Все отключённые RAG-входные точки этого атома SHALL быть помечены маркером `TODO(rag)` (включая варианты с пояснением после двоеточия). Поиск по репозиторию `TODO(rag)` MUST находить заготовки. Модули `rag-ipc`, типы и константы RAG/embedding MUST NOT удаляться подчистую в этом атоме.

#### Scenario: Repository search finds RAG stubs
- **WHEN** разработчик выполняет поиск `TODO(rag)` по репозиторию
- **THEN** MUST находиться как минимум маркеры у chat attach/upload, RAG settings и embedding-models входных точек
- **AND** файлы `shared/apis/rag-ipc` (или их эквивалент) MUST оставаться в дереве исходников

### Requirement: MVP modes without documents stay on BackendClient
Режимы chat, translation и instruction без документов SHALL продолжать работать через `BackendClient` (Tauri или HTTP). Этот атом MUST NOT удалять Electron, MUST NOT реализовывать RAG в rust-core и MUST NOT трогать splash / Embedded Ollama / API configuration rewrite / perf lazy-loading (атомы 6.2–6.4 и 7.1).

#### Scenario: Translation and instruction still generate
- **WHEN** пользователь выполняет translation или instruction без документов после консервации RAG UI
- **THEN** запрос MUST идти через `BackendClient.model`
- **AND** UI MUST NOT требовать RAG configuration или attach file

#### Scenario: Out of scope stays untouched
- **WHEN** атом 6.1 завершён
- **THEN** `electron-app/` и `ElectronTransport` MUST оставаться в репозитории
- **AND** rust-core MUST NOT получить RAG use-cases / ports из этого атома
- **AND** splash UI и Embedded Ollama settings MUST NOT считаться закрытыми этим атомом
