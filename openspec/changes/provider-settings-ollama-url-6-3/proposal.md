# Proposal

## Why

После 6.1 (RAG) и 6.2 (splash) settings всё ещё живут в модели Electron: runtime-провайдер **`Embedded Ollama`**, manage models только для него, hardcoded `provider: 'Embedded Ollama'` в thunks, а list/install/remove/catalog в rust-core/hosts опираются на **глобальный** URL процесса, не на поле `url` из UI. Атом **6.3** приводит API configuration к модели rust-core: один локальный **`Ollama`** + видимый `url` + manage models по этому URL, без ollama-manager / Embedded Ollama — до perf (6.4) и выпила Electron (7.1).

## What Changes

- **BREAKING (product UI):** убрать провайдер **`Embedded Ollama`** из `ProviderType`, списка `PROVIDERS`, default provider, Redux `provider-settings-slice`, веток settings UI (~408–477 / manage models «только Embedded»), hardcoded update в `model-ipc-slice`, i18n/упоминаний и macOS-ветки «оставить только Embedded»
- В **API configuration** зафиксировать MVP-набор: **provider** (runtime пока только `Ollama`, список/`switch` расширяемы), **url** (всегда для Ollama), **manage models** (всегда для Ollama; list/install/remove/catalog с **base URL + provider id** из settings)
- Миграция persist: `Embedded Ollama` в localStorage/redux-persist → нормализовать в `Ollama` (сохранить model/url по возможности); id `embedded-ollama` → `ollama`
- Manage-models UX обобщить/переименовать (не обязан оставаться «Embedded» в имени), без переписывания всего FSD settings
- Заложить UI-точки расширения под будущие облачные провайдеры (API key и т.п.) через тот же `BackendClient`, **без** возврата Embedded / ollama-manager
- **Контрактная дыра (наблюдаемо):** `InstallRequest` / `RemoveRequest` / `ListModelsRequest` и host wiring (`ModelService` на одном process-URL) **не** принимают base URL из тела запроса; `generate` несёт `id`/`url`, но host их не пересобирает. При подтверждении дыры — точечно расширить DTO/application/ports в hex-слоях и прокинуть url из invoke/HTTP body; env host — fallback, не единственный источник истины, если UI задал url
- Порядок этапа: 6.1 → 6.2 → **6.3** → 6.4 → 7.1
- **Не** делать: полные адаптеры OpenRouter/Claude; возврат Embedded / ollama-manager / splash lifecycle в rust-core; 6.4 perf; 7.1 удаление Electron; повторную консервацию RAG/splash; широкий рефакторинг FSD; RAG в rust-core

## Capabilities

### New Capabilities

- `provider-settings-ui`: продуктовая API configuration MVP — один runtime-провайдер `Ollama`, видимый `url`, manage models по url из settings; удаление Embedded Ollama из UI/типов/defaults; миграция persist; расширяемый селектор/`switch(provider)` без реализации облачных адаптеров

### Modified Capabilities

- `mvp-api-contract`: list / install / remove (и при необходимости catalog-запросы с локальным merge) SHALL принимать provider `id` + `url` из payload запроса (или эквивалентный вложенный `ProviderConfig`), а не только подразумевать env host
- `mvp-use-cases`: use-cases `model.list` / `install` / `remove` и локальный список в `catalog.*` MUST использовать base URL (+ provider id) из запроса, когда он задан; иначе — конфиг wiring host
- `llm-provider`: продуктовый MVP-id — `ollama`; `embedded-ollama` MAY оставаться alias резолва в тот же Ollama-адаптер для back-compat, но UI MUST NOT предлагать Embedded как отдельный провайдер
- `react-backend-client`: `BackendClient.model` list/install/remove (и catalog-вызовы manage-models) MUST принимать/прокидывать provider config (`id`/`url`) из settings, без hardcoded Embedded
- `server-http-adapter`: HTTP handlers MUST прокидывать url/provider id из body/query в core; process env URL — fallback, не единственный источник истины при явном url в запросе
- `tauri-thin-host`: invoke MUST прокидывать url/provider id в core для list/install/remove/catalog; process wiring остаётся для generate/`stop` на одном `Arc`, но manage-models MUST NOT игнорировать url из UI

## Impact

- Frontend: `react-app` — `global.d.ts` (`ProviderType`), `provider-settings-slice` (+ types/constants), `widgets/settings` (`settings.tsx`, `constants/settings.ts` PROVIDERS, `manage-embedded-ollama.tsx` / rename, `model-ipc-slice`, apis/types), `use-model` / `chat-context` ветки Embedded, i18n
- Shared API: `BackendClient` / transports / `types.ts` — сигнатуры list/install/remove (+ catalog при дыре)
- Rust: `underlator-core` domain DTO + application model/catalog (+ ports при необходимости) в hex-слоях; thin pass-through в `underlator-server` / `underlator-tauri`
- Persist: redux-persist migration / normalize на hydrate
- Вне скоупа: OpenRouter/Claude adapters, 6.4, 7.1, RAG/splash regress, Electron removal
