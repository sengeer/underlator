# Tasks

## 1. Main: снять splash gate и законсервировать overlay

- [ ] 1.1 В `react-app/src/pages/main/ui/main.tsx` отключить gating основного UI через `selectSplashVisible` / `isSplashVisible` (comment-out / flag / всегда показывать children) с маркером `// TODO(splash): restore when rust-core/desktop splash lifecycle exists`; проверить, что основной UI рендерится без ожидания splash
- [ ] 1.2 Законсервировать mount/рендер `<SplashScreen />` в `main.tsx` (не рендерить overlay на MVP path либо свести к no-op) с `TODO(splash)`; проверить отсутствие блокирующего splash overlay поверх UI
- [ ] 1.3 Убедиться, что импорты/`selectSplashVisible` не оставляют другого живого gate blank screen; проверить `rg 'selectSplashVisible|SplashScreen' react-app/src/pages/main`

## 2. Splash IPC / slice: no-op bootstrap без ожидания events

- [ ] 2.1 В `splash-screen.tsx` / `splash-screen-ipc.ts` / slice отключить обязательные `fetchSplashStatus` и подписки `onStatusUpdate` / `onProgressUpdate` / `onComplete` / `onError` (early-return / comment-out / `SPLASH_UI_ENABLED = false`) с `TODO(splash)`; проверить, что cold start не ждёт splash events
- [ ] 2.2 При необходимости выставить initial `visible: false` или эквивалентный no-op complete/hide так, чтобы не было flash blank screen до useEffect; проверить отсутствие длительного `visible: true` gate без backend
- [ ] 2.3 Модули splash (UI, slice, api, types, constants, styles) **не** удалять; проверить, что файлы на месте (`ls` / `rg` по `pages/main/**/splash-screen*`)

## 3. i18n / use-electron-translation и регрессия старта

- [ ] 3.1 Проверить, что `use-electron-translation` / вызов `translateElectron` в `Main` и splash-связанные i18n-ключи не бросают необработанных ошибок при старте без Electron splash; при необходимости точечный guard + `TODO(splash)` — без вырезания translation catalog
- [ ] 3.2 Ручной smoke cold start Tauri (`tauri dev` и/или AppImage) и/или HTTP/web: основной MVP UI доступен сразу после загрузки React; нет hang на splash IPC; проверить chat/navigation/settings открываются
- [ ] 3.3 При необходимости обновить точечные unit-тесты (`wire-sites` / формулировки про splash), не подключая splash к `BackendClient`; проверить, что существующие MVP client tests проходят

## 4. Scope guards и Definition of Done checks

- [ ] 4.1 Выполнить `rg 'TODO\(splash\)'` по репозиторию и убедиться, что находятся заготовки как минимум у Main/overlay gate и IPC/bootstrap path
- [ ] 4.2 Скан scope: нет порта splash/embedded installer в rust-core; нет правок 6.3 Embedded Ollama / API configuration rewrite; нет 6.4 perf/lazy; нет 7.1 удаления Electron / `ElectronTransport` / `electron-app`; нет повторной консервации RAG; нет широкого FSD-рефакторинга вне splash; проверить `git diff` / review
- [ ] 4.3 Подтвердить порядок этапа: опора на закрытый 6.1; следующий атом после 6.2 — **6.3**, не 7.1

## Definition of Done (DoD)

Change `conserve-splash-ui-6-2` считается выполненным **только если** все пункты ниже истинны:

1. **Приложение стартует без splash IPC:** cold start Tauri и/или HTTP/web не зависает в ожидании status/progress/complete/error от `splash.*`; нет обязательного live splash lifecycle на MVP path
2. **`rg 'TODO\(splash\)'`** находит заготовки консервации (Main/overlay gate, IPC/bootstrap и связанные отключённые входные точки)
3. **MVP UI доступен сразу** после загрузки React (основной интерфейс не гейтится splash overlay)
4. **Splash-модули на месте:** компонент, slice, api, типы, стили/константы **не** удалены подчистую — только входные точки отключены
5. **i18n / `use-electron-translation`** не ломают старт приложения
6. **Вне скоупа не сделано:** порт splash/embedded installer в rust-core; 6.3 Embedded Ollama / API configuration rewrite; 6.4 perf / lazy; 7.1 удаление Electron / `ElectronTransport` / `electron-app`; повторная консервация RAG (6.1); широкий FSD-рефакторинг
7. Порядок этапа сохранён: после 6.2 следующий атом — **6.3**, не 7.1
