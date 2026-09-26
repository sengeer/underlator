# Proposal

## Why

После закрытого атома 6.1 (консервация RAG UI) dual-mode MVP всё ещё зависит от Electron splash lifecycle (`window.electron.splash`, ollama-manager init), которого нет в rust-core / Tauri / HTTP. `Main` гейтит весь UI через `selectSplashVisible`, а Redux стартует с `visible: true` — cold start может зависать в ожидании splash events или показывать overlay без backend. Атом 6.2 — следующий шаг этапа 6: законсервировать splash UI **до** Embedded Ollama (6.3), perf (6.4) и выпила Electron (7.1).

## What Changes

- Найти и законсервировать splash-цепочку во frontend: `pages/main` (`SplashScreen`, `splash-screen-ipc-slice`, `selectSplashVisible` / `selectSplashScreenState`), API `splash-screen-ipc` / вызовы `splash.*`, подписки на status/progress/complete/error
- Скрыть splash overlay при старте в Tauri/HTTP (и выровнять dual-mode MVP) так, чтобы сразу был основной UI — короткий no-op bootstrap без IPC splash; cold start MUST NOT зависать в ожидании splash events
- Отключить входные точки comment-out / early-return / feature-flag с маркерами `// TODO(splash): restore when rust-core/desktop splash lifecycle exists`
- Проверить, что `use-electron-translation` / i18n, связанные со splash, не ломают старт приложения
- Модули splash (компонент, slice, api, типы, стили, константы) **НЕ** удалять подчистую — только входные точки
- Опереться на закрытый 6.1; порядок этапа: 6.1 → **6.2** → 6.3 → 6.4 → 7.1
- **Не** делать: порт splash / embedded installer в rust-core; 6.3 Embedded Ollama / API configuration rewrite; 6.4 perf / lazy loading; 7.1 удаление Electron / `ElectronTransport` / `electron-app`; повторную консервацию RAG (уже 6.1); широкий рефакторинг FSD вне нужного для splash

## Capabilities

### New Capabilities

- `splash-ui-conservation`: консервация splash UI для MVP без rust-core/desktop splash lifecycle — скрытие overlay, no-op bootstrap без `splash.*` IPC, отключение входных точек с маркерами `TODO(splash)`, сохранение модулей как заготовок; cold start Tauri/HTTP/web сразу показывает основной MVP UI

### Modified Capabilities

- `react-backend-client`: уточнение — поверхность `splash.*` MAY оставаться в коде как законсервированная заготовка с `TODO(splash)`, но MVP product UI MUST NOT ждать splash IPC и MUST NOT блокировать основной UI на splash events; после 6.2 формулировка «MAY оставаться на Electron IPC до 6.2» закрывается; wiring MVP `model` / `catalog` / `chat` через `BackendClient` MUST остаться без регрессий

## Impact

- Код: в основном `react-app` — `pages/main/ui/main.tsx`, `pages/main/ui/splash-screen.tsx`, `pages/main/models/splash-screen-ipc-slice.ts`, `pages/main/apis/splash-screen-ipc.ts`, store registration `splashScreen`, типы/константы/стили splash; точечно `use-electron-translation` / i18n только если ломают старт
- Модули splash (компонент, slice, api, типы, стили, константы) и типы `window.electron.splash` в `global.d.ts` — **сохраняются** (не удалять подчистую)
- `BackendClient`, Tauri/HTTP hosts, `underlator-core` — без splash lifecycle и без смены MVP DTO
- Electron остаётся до 7.1; Embedded Ollama / API configuration / perf — следующие атомы 6.x
- Маркер поиска заготовок: `TODO(splash)` (`rg 'TODO\(splash\)'`)
