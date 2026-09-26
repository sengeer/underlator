# Design

## Context

См. `proposal.md` (Why) и delta-спеки `splash-ui-conservation`, `react-backend-client`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §6.2. Gate: закрытый 6.1; дальше по плану только 6.3 → 6.4 → 7.1.

Наблюдение (код, не план):

- `main.tsx`: рендерит `<SplashScreen />`, основной UI гейтится `{isSplashVisible ? null : (…)}` через `selectSplashVisible`
- `splash-screen-ipc-slice.ts`: `initialState.visible = true` — до hide/complete UI скрыт
- `splash-screen.tsx`: при отсутствии `window.electron?.splash` уже делает `complete()` + `hide()` (задел 4.2 для HTTP); при наличии Electron — `fetchSplashStatus` + подписки status/progress/complete/error
- `splash-screen-ipc.ts`: прямой `window.electron.splash.*`; не через `BackendClient` (контракт 4.1 без splash)
- `store.ts`: регистрирует `splashScreen` reducer (не persist)
- `use-electron-translation`: ключи вроде `DOWNLOADING_OLLAMA` / `LOADING_APP` используются splash UI и Electron menu sync; хук вызывается из `Main` при mount — не должен ронять старт при no-op splash
- `wire-sites.test.ts` / `backend-client.test.ts`: фиксируют, что splash остаётся вне `BackendClient`

## Goals / Non-Goals

**Goals:**

- Убрать зависимость MVP UI от splash IPC lifecycle на Tauri/HTTP (и выровнять dual-mode: не зависать на Electron splash events в пути продукта)
- Сохранить splash-модули как заготовки с единым маркером `TODO(splash)`
- Гарантировать cold start с сразу доступным основным UI
- Минимальный diff: comment-out / early-return / простой flag / initial `visible: false` + no-op bootstrap — без широкого FSD-рефакторинга

**Non-Goals:**

- Порт splash / embedded installer / ollama-manager lifecycle в rust-core или Tauri host
- 6.3 Embedded Ollama / API configuration rewrite
- 6.4 perf / lazy loading
- 7.1 удаление Electron / `ElectronTransport` / `electron-app`
- Повторная консервация RAG (уже 6.1)
- Удаление модулей splash «подчистую»
- Переписывание всего i18n catalog (достаточно, чтобы старт не падал)

## Decisions

1. **Консервация входных точек, не удаление модулей**  
   Предпочтение плана: отключить mount/gate/подписки + `// TODO(splash): restore when rust-core/desktop splash lifecycle exists`, либо early-return / `const SPLASH_UI_ENABLED = false`. Файлы UI, slice, api, types, styles, constants остаются.  
   *Альтернатива:* удалить splash-дерево — ломает будущий возврат и противоречит §6.2. Отклонено.  
   *Альтернатива:* только положиться на уже существующий HTTP no-op в `SplashScreen` — недостаточно: Electron-путь всё ещё ждёт events; Main всё ещё гейтит UI; маркер `TODO(splash)` не появляется системно. Отклонено как единственная мера.

2. **Разблокировать Main UI независимо от splash overlay**  
   Сделать так, чтобы `isSplashVisible` не держал blank screen: либо не рендерить `<SplashScreen />` / не гейтить children, либо стартовать slice с `visible: false` / сразу dispatch hide в no-op bootstrap с `TODO(splash)`. Overlay MUST NOT быть обязательным gate.  
   *Альтернатива:* CSS `display: none` на overlay при `visible: true` gate — Main всё ещё не показывает children. Отклонено.  
   *Альтернатива:* оставить gate, но форсировать hide только в Tauri/HTTP detect — допустимо как реализация, если Electron product path тоже не зависает в dual-mode MVP; предпочтительно единый no-op для всех hosts этапа 6.

3. **Отключить живые `splash.*` подписки на MVP path**  
   В `SplashScreen` / api: не вызывать `fetchSplashStatus` и `onStatusUpdate` / `onProgressUpdate` / `onComplete` / `onError` как обязательный lifecycle; early-return / comment-out / flag с `TODO(splash)`. Код методов API сохраняется.  
   *Альтернатива:* оставить подписки «на всякий случай» при отсутствии backend — риск таймаутов/ошибок/notification spam. Отклонено для обязательного path.

4. **i18n / `use-electron-translation` — smoke, не вырезание**  
   Не удалять splash-ключи из translations object. Убедиться, что `translateElectron()` при отсутствии Electron API остаётся best-effort (как сейчас или с точечным guard) и не блокирует mount `Main`.  
   *Альтернатива:* вычистить все splash-строки из i18n — шире скоупа, риск меню Electron до 7.1. Отклонено.

5. **Маркер `TODO(splash)` — канон поиска**  
   Единый префикс `TODO(splash)` (допустим текст после `: `). DoD: `rg 'TODO\(splash\)'` находит заготовки у Main/overlay gate и IPC/bootstrap. Не путать с уже существующими `TODO(rag)`.

6. **Без изменений rust-core / hosts**  
   Атом — только `react-app` (+ при необходимости точечные unit-тесты wiring). Arch-lint / `cargo test -p underlator-core` не gate, кроме случайной правки core (её быть не должно). Тесты вроде `wire-sites` MAY обновить формулировку «splash законсервирован», не подключая splash к `BackendClient`.

## Risks / Trade-offs

- [Оставили gate в Main, отключили только overlay render] → blank screen; парно снимать gate **и** живые IPC-подписки
- [Electron-режим потеряет splash lifecycle раньше 7.1] → осознанный trade-off этапа 6: dual-mode UI выровнен под rust-core MVP; код сохраняется с TODO
- [Краткий flash overlay при `visible: true` до useEffect hide] → предпочесть initial `visible: false` или не монтировать SplashScreen / не гейтить UI
- [Notification spam от `fetchSplashStatus` reject] → не диспатчить fetch на законсервированном path
- [Широкий FSD-рефакторинг «заодно»] → запрещён; только точки входа splash
- [Сломать `use-electron-translation` при «чистке» ключей] → не трогать ключи без нужды; только smoke старта

## Migration Plan

1. Законсервировать Main gate + mount `SplashScreen` (overlay не блокирует UI)
2. Отключить IPC bootstrap / подписки `splash.*` с `TODO(splash)`; модули оставить
3. Smoke i18n / `translateElectron` на старте
4. Проверить `rg 'TODO\(splash\)'` и cold start Tauri и/или HTTP/web: основной UI сразу, без hang
5. Rollback: revert commit / раскомментировать блоки по `TODO(splash)` — без миграции данных

## Open Questions

Нет блокирующих: `SPLASH_UI_ENABLED = false` vs чистый comment-out vs initial `visible: false` — на усмотрение implementer при apply, любой вариант удовлетворяет спеке, если cold start не ждёт splash IPC и модули на месте.
