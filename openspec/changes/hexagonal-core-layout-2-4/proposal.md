# Proposal

## Why

Атомы 2.1–2.3 уже дали HTTP-клиент, `LlmProvider` и use-cases MVP, но `underlator-core` всё ещё в плоской раскладке (`http/`, `provider/`, `model/use_cases.rs` рядом с DTO). Без проверяемых границ слоёв атомы 3.x снова смешают application с Ollama/filesystem и размоют ports. Сейчас — последний атом этапа 2, до inbound-адаптеров в hosts.

## What Changes

- Подключить архитектурный линтер границ модулей внутри одного crate (**предпочтительно `arch-lint`**: TOML-scopes, `deny-scope-dep` / `restrict-use`, `arch_lint::check!()` в `cargo test`). `rustqual` Architecture — запасной вариант, если `arch-lint` не закроет слои. `hex-lint` **не** основной tool (он видит crates, не модули). `cargo clippy` — companion quality gate, не замена layer lint
- Зафиксировать правила: `application` не импортирует `adapters::*` (только ports); `ports` не импортируют adapters; `domain` не импортирует adapters и `reqwest`/`hyper`; исходящий HTTP-crate только в adapter HTTP
- Перенести код `underlator-core` в `domain/` / `ports/` / `application/` / `adapters/out/{http,ollama,fs,…}`; `lib.rs` — composition root (`pub use` + wiring)
- Сохранить публичный API через реэкспорт, чтобы не ломать будущих потребителей; **не** менять поведение MVP use-cases и провайдера
- Пометить `underlator-server` / `underlator-tauri` как driving adapters (rustdoc / правила), без новых routes/commands
- Обновить Cursor rules и OpenSpec `context`: после 2.4 новый код только в hex-слоях; DoD последующих Rust-change включает arch-lint + `cargo test -p underlator-core`
- Тесты границ как gate: линтер падает на запрещённом импорте (negative/regression); существующие unit/mock-тесты остаются зелёными
- **Не** делать: Axum/Tauri routes, React `BackendClient`, RAG, выпил Electron, новую бизнес-логику MVP

## Capabilities

### New Capabilities

- `hexagonal-core`: строгая гексагональная раскладка `underlator-core` (слои, composition root, линтер границ, driving adapters в hosts, запрет плоских модулей у корня `src/` после 2.4)

### Modified Capabilities

- `mvp-use-cases`: снимается запрет «hex-раскладка 2.4 ещё не требуется»; use-cases MUST жить в `application/` и MUST NOT импортировать adapters / `reqwest` / `hyper`
- `llm-provider`: trait `LlmProvider` MUST жить в `ports/`; runtime Ollama и stubs MUST жить в `adapters/out`
- `unified-http-client`: унифицированный клиент MUST жить в `adapters/out/http`; `reqwest`/`hyper` MUST NOT импортироваться из `domain` / `ports` / `application`; сценарии `No provider or use-case runtime` и `Use-cases and hosts stay out of HTTP layer` сохраняют имена и описывают границу слоёв (use-cases не в HTTP-адаптере), а не отсутствие use-cases в core

## Impact

- Код: только `crates/underlator-core` (переезд модулей, `arch-lint.toml`, `tests/architecture.rs`); точечный rustdoc в host-crates без MVP routes
- Зависимости: `arch-lint` как **dev-dependency** core (не runtime). Без `tauri` / `axum` в core. `hex-lint` и полный `rustqual` не обязательны, если `arch-lint` закрывает слои
- Поведение generate / catalog / chat / Ollama **не** меняется; Electron и React этим атомом не правятся
- Следующие атомы 3.x пишут inbound adapters в hosts и outbound только в `adapters/out`
