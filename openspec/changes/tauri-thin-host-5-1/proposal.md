# Proposal

## Why

Атомы 2.3–2.4, 3.1 и 4.1 уже дали MVP use-cases в hex-ядре, HTTP/SSE host и transport-agnostic `BackendClient` с `TauriTransport`-скелетом. `underlator-tauri` по-прежнему каркас без commands: desktop MVP живёт только на Electron. Атом 5.1 закрывает dual-mode на desktop: тот же core через Tauri 2 driving adapter, без дублирования бизнес-логики и без выпила Electron (6.1).

## What Changes

- Поднять `underlator-tauri` как Tauri 2 **driving/inbound adapter**: thin commands/events → `ModelService` / `CatalogService` / `ChatService`, без доменных правил и без прямого `reqwest`/HTTP к Ollama из host
- Зарегистрировать все 14 MVP commands по карте ядра (`model_generate` … `chat_add_message`) и progress-события `model:generate-progress` / `model:install-progress` (аналог SSE server 3.1 / контракт `TauriTransport` 4.1)
- Wiring composition root host: provider factory, `FilesystemChatStore` + `StorageRoot` на **desktop app data dir** (не пути server/docker)
- Довести frontend `TauriTransport` до рабочей wiring (invoke + listen); выбор `detectTransport` / `VITE_BACKEND_MODE=tauri` → Tauri на desktop, без поломки `HttpTransport` / `ElectronTransport`
- Desktop-only **заготовки** (не блокер MVP): mailto / native dialogs; splash / embedded Ollama — явно later, без runtime
- Чеклист сравнения поведения с Electron на тех же MVP-сценариях `model` / `catalog` / `chat` (полная выпилка Electron — не здесь)
- **Не** делать: атом 6.1; правки `underlator-server` / docker (кроме крайней дыры контракта — описать, не раздувать); новую бизнес-логику / смену DTO в core «с нуля»; RAG; SSE→WebSocket; multi-user IAM; рефакторинг React/FSD вне Tauri transport wiring

## Capabilities

### New Capabilities

- `tauri-thin-host`: Tauri 2 inbound adapter в `underlator-tauri` над application/ports API ядра (MVP commands/events, desktop `StorageRoot`, hex-запрет обхода core, desktop-only stubs, паритет сценариев с Electron)

### Modified Capabilities

- `react-backend-client`: снимается ограничение «Tauri-транспорт — только typed skeleton / host без MVP commands»; `TauriTransport` MUST работать против живого host (invoke + listen), desktop detect/`VITE_BACKEND_MODE=tauri` MUST выбирать Tauri без silent fallback на Electron/HTTP
- `hexagonal-core`: снимается запрет «`underlator-tauri` MUST NOT получать MVP commands, пока нет desktop-host»; host SHALL смапить `model` / `catalog` / `chat` на use-cases без доменной логики и без `reqwest`/Ollama в tauri crate
- `rust-workspace`: `underlator-tauri` перестаёт быть только «prepared for Tauri 2» каркасом: MUST предоставлять runnable desktop host с MVP surface над core (feature `desktop` / native deps — как в design)

## Impact

- Код: в основном `crates/underlator-tauri` (commands, state/wiring, events, config app data dir, stubs); точечно `react-app/src/shared/api/transports/tauri-transport.ts` (+ тесты detect/bridge), возможно Vite/Tauri build wiring для frontendDist; `Cargo.toml` host (serde, tauri plugins при необходимости). `underlator-core` — без новой бизнес-логики; допустимы только реэкспорт/мелочи, если host не может вызвать уже существующий API
- Зависимости: core по-прежнему без `tauri`/`axum`. Tauri host MUST NOT добавлять `reqwest` для LLM
- Electron и server-режимы остаются рабочими; выпил `ElectronTransport` / `electron-app` — атом 6.1
- Следующий логический шаг после паритета MVP — 6.1 (не в скоупе)
