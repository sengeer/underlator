# splash-ui-conservation Specification

## Purpose
Консервирует splash UI в `react-app` для MVP без rust-core/desktop splash lifecycle: скрывает overlay, делает no-op bootstrap без `splash.*` IPC, оставляет код заготовками с `TODO(splash)`, обеспечивает cold start с сразу доступным основным UI.

## Requirements

### Requirement: Splash overlay does not block MVP UI at startup
При старте приложения в dual-mode MVP (Tauri, HTTP/web) splash overlay SHALL NOT блокировать основной UI. Пользователь MUST видеть основной интерфейс сразу после загрузки React (или после короткого no-op bootstrap без ожидания splash IPC). Cold start MUST NOT зависать в ожидании событий status/progress/complete/error от `splash.*`.

#### Scenario: Main UI is visible without splash IPC on Tauri
- **WHEN** пользователь запускает desktop Tauri (`tauri dev` или AppImage) после атома 6.2
- **THEN** основной MVP UI (навигация / chat / translation / settings) MUST отображаться без ожидания `window.electron.splash` events
- **AND** splash overlay MUST NOT оставаться поверх UI как обязательный gate

#### Scenario: Main UI is visible without splash IPC on HTTP or web
- **WHEN** пользователь открывает приложение в HTTP/web режиме после атома 6.2
- **THEN** основной MVP UI MUST быть доступен сразу после загрузки React
- **AND** отсутствие splash backend MUST NOT оставлять blank screen из-за `selectSplashVisible === true`

#### Scenario: Cold start does not hang on splash events
- **WHEN** выполняется cold start без Electron splash lifecycle
- **THEN** приложение MUST NOT ждать бесконечно status/progress/complete/error от `splash.*`
- **AND** MUST перейти к основному UI через no-op bootstrap или эквивалентную консервацию входных точек

### Requirement: Splash entry points are conserved not deleted
Входные точки splash-цепочки (`SplashScreen` в `pages/main`, gating через `selectSplashVisible` / `selectSplashScreenState`, API `splash-screen-ipc` / вызовы `splash.*`, подписки на status/progress/complete/error, связанные dispatch/thunk) SHALL быть отключены на входной точке (comment-out / early-return / feature-flag), а не удалены. Каждая отключённая входная точка MUST иметь маркер `// TODO(splash): restore when rust-core/desktop splash lifecycle exists` (или эквивалентный `TODO(splash)` с пояснением).

#### Scenario: SplashScreen mount path is disabled
- **WHEN** разработчик инспектирует `Main` / mount path splash overlay
- **THEN** рендер/инициализация `SplashScreen`, которая запускает живые `splash.*` подписки, MUST быть отключена или сведена к no-op с `TODO(splash)`
- **AND** файлы компонента и стилей MUST оставаться в репозитории

#### Scenario: Splash IPC subscriptions are not live on MVP path
- **WHEN** MVP UI стартует на Tauri или HTTP после атома 6.2
- **THEN** MUST NOT быть обязательных живых подписок на `splash.onStatusUpdate` / `onProgressUpdate` / `onComplete` / `onError`, без которых UI не показывается
- **AND** код API/slice MAY оставаться с `TODO(splash)`

### Requirement: Splash modules remain as stubs
Модули splash (компонент, Redux slice, API, типы, константы, стили) SHALL NOT удаляться подчистую в этом атоме. Они MUST оставаться в дереве исходников как заготовки для будущего desktop splash lifecycle. Типы `window.electron.splash` в declarations MAY сохраняться.

#### Scenario: Splash source modules still exist
- **WHEN** разработчик ищет splash-модули после атома 6.2
- **THEN** файлы `splash-screen` UI, `splash-screen-ipc` API/slice, типы и стили MUST присутствовать в `react-app`
- **AND** MUST NOT быть массового удаления splash-дерева как единственной меры консервации

### Requirement: Conserved splash code is discoverable via TODO markers
Все отключённые splash-входные точки этого атома SHALL быть помечены маркером `TODO(splash)` (включая варианты с пояснением после двоеточия). Поиск по репозиторию `TODO(splash)` MUST находить заготовки.

#### Scenario: Repository search finds splash stubs
- **WHEN** разработчик выполняет поиск `TODO(splash)` по репозиторию
- **THEN** MUST находиться маркеры у отключённых входных точек splash (как минимум Main/overlay gate и IPC/bootstrap path)
- **AND** маркер MUST указывать на восстановление после появления rust-core/desktop splash lifecycle

### Requirement: Splash-related i18n does not break startup
Хук `use-electron-translation` и i18n-строки, связанные со splash / Electron menu sync, SHALL NOT ломать старт приложения после консервации splash. Вызов синхронизации переводов при монтировании MUST оставаться безопасным no-op или best-effort при отсутствии Electron splash/menu API.

#### Scenario: Startup with translation hook succeeds
- **WHEN** приложение монтирует `Main` и вызывает `translateElectron` / читает splash-связанные translation keys после атома 6.2
- **THEN** старт MUST завершаться без необработанного исключения из-за отсутствия splash IPC
- **AND** основной UI MUST оставаться доступным

### Requirement: Out of scope stays untouched
Этот атом MUST NOT портировать splash / embedded installer в rust-core, MUST NOT делать Embedded Ollama / API configuration rewrite (6.3), perf / lazy loading (6.4), удаление Electron / `ElectronTransport` / `electron-app` (7.1), повторную консервацию RAG (уже 6.1) и MUST NOT выполнять широкий рефакторинг FSD вне нужного для splash.

#### Scenario: Downstream atoms remain open
- **WHEN** атом 6.2 завершён
- **THEN** `electron-app/` и `ElectronTransport` MUST оставаться в репозитории
- **AND** rust-core MUST NOT получить splash / embedded-installer use-cases из этого атома
- **AND** RAG conservation (6.1) MUST NOT переписываться; 6.3 / 6.4 / 7.1 MUST NOT считаться закрытыми этим атомом
