# Design

## Context

См. `proposal.md` (Why) и delta-спеки `hexagonal-core` / `mvp-use-cases` / `llm-provider` / `unified-http-client`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §2.4.  
Наблюдение: `underlator-core` уже содержит DTO, `CoreError`, `HttpClient` (`src/http/`, единственное место `reqwest`), `LlmProvider` + `OllamaProvider` (`src/provider/`), use-cases и ports (`model/use_cases.rs`, `catalog/{use_cases,library}.rs`, `chat/{use_cases,store,fs_store}.rs`). `lib.rs` явно пишет, что hex 2.4 не сделан. Архитектурные проверки сейчас — строковые сканы в `http/tests.rs` и `provider/tests.rs` (нет `use`/`inline` AST). Host-crates — каркас: server `/healthz`, tauri без MVP commands. `arch-lint` в репозитории нет. Context7 знает `rustqual` Architecture; `ynishi/arch-lint` в Context7 нет (документация — README crate 0.6: scopes, `deny-scope-dep`, `restrict-use`, `arch_lint::check!()`).

## Goals / Non-Goals

**Goals:**

- Сначала зелёный конфиг линтера границ, затем переезд файлов, затем тесты как gate
- Целевое дерево слоёв + composition root с `pub use`
- Negative/regression: запрещённый импорт ломает `cargo test -p underlator-core`
- Сохранить поведение и JSON-ключи MVP; обновить path-сканы и rustdoc

**Non-Goals:**

- Новая бизнес-логика model/catalog/chat, смена ондиск-формата чатов, `spawn_blocking` для `std::fs`
- Axum/Tauri MVP, React `BackendClient`, RAG, выпил Electron
- Подключение `hex-lint` (границы crates) и обязательный полный `rustqual`
- Включение preset `strict`/`recommended` arch-lint (unwrap / sync-io) — это не атом границ; `FilesystemChatStore` сознательно на `std::fs`

## Decisions

1. **Порядок работ как в плане: линтер → раскладка → тесты**  
   Сначала `arch-lint` dev-dep, `crates/underlator-core/arch-lint.toml` под **целевые** пути, `tests/architecture.rs` с `arch_lint::check!(config = "arch-lint.toml")`. Затем создать пустые `mod` слоёв и перенести файлы так, чтобы тот же конфиг стал зелёным в одном change (не оставлять permanently red gate). Существующие string-сканы обновить в конце под новые пути.  
   *Альтернатива:* сначала move, потом линтер — нарушает обязательный порядок §2.4. Отклонено.

2. **Основной tool — `arch-lint`, не `rustqual` и не `hex-lint`**  
   Один crate: нужны модульные scopes и проверка `use` + inline-путей. `arch-lint` это даёт и садится в `cargo test`. `hex-lint` видит только роли **crates** — для 2.4 бесполезен. `rustqual` Architecture (`layers` / `forbidden`, `unmatched_behavior`) — запасной путь **только если** `arch-lint` 0.6 не сможет выразить матрицу deny; в атом не добавлять второй конфиг «на всякий случай».  
   *Альтернатива:* только rustqual.toml — слабее интеграция в уже принятый `cargo test -p underlator-core`. Отклонено как primary.

3. **Preset `minimal` + только декларативные правила слоёв**  
   `preset = "minimal"` (AL001 relaxed). Явно **не** включать `recommended` (AL002 `no-sync-io` упадёт на `fs_store.rs`). Clippy (`cargo clippy -p underlator-core -- -D warnings`) — отдельный quality gate рядом, не замена layer lint.  
   *Альтернатива:* `recommended` + `exclude_files` для fs — смешает 2.4 с политикой blocking IO. Отклонено.

4. **Матрица `deny-scope-dep`, не линейный `[[layering]]`**  
   Гексагон не стек: adapters зависят от ports+domain и **не** от application. Линейный `order` либо разрешит `adapters → application`, либо запретит нужное. Scopes: `domain`, `ports`, `application`, `adapters` (`src/adapters/**`), `composition` (`src/lib.rs` и тонкий wiring, если вынесем). Deny:
   - domain → ports, application, adapters
   - ports → application, adapters
   - application → adapters
   - adapters → application  
   `restrict-use`: `reqwest::*` / `hyper::*` на `src/**` с `except` HTTP-адаптера. Composition MAY импортировать все слои (wiring).  
   *Альтернатива:* `[[layering]] order = ["adapters","application","ports","domain"]` — ломает «adapters не знают application». Отклонено.

5. **Карта переноса (поведение не менять)**  

   | Сейчас | Куда |
   | --- | --- |
   | `error.rs`, `host_error.rs`, `events.rs`, `iso8601.rs`, `contract.rs`, `rag.rs`, `splash.rs` | `domain/` |
   | `model/dto.rs`, `catalog/dto.rs`, `chat/dto.rs` | `domain/{model,catalog,chat}/` |
   | `catalog/library.rs` → `static_library_models` | `domain/catalog/` (данные fallback, без HTTP) |
   | `provider/port.rs`, `chat/store.rs` (только traits + `StorageRoot`), `CatalogLibrary` trait | `ports/` |
   | `model/use_cases.rs`, `catalog/use_cases.rs`, `chat/use_cases.rs` (+ `Clock` / `IdGenerator`) | `application/` |
   | `http/` | `adapters/out/http/` |
   | `provider/{ollama,stub,factory,config}.rs` | `adapters/out/ollama/` (factory — исходящий слой, реэкспорт из `lib.rs`) |
   | `catalog/library.rs` HTTP-адаптер | `adapters/out/` (library HTTP) |
   | `chat/fs_store.rs`, `MemoryChatStore` | `adapters/out/fs/` и memory-адаптер (не port) |

   Пустые заготовки `rag`/`splash` остаются в `domain` (без IO). Плоских `pub mod http` / `provider` / `model` у корня `src/` после переезда нет.  
   *Альтернатива:* оставить root-фасады `pub mod model` как re-export модули — снова плоские имена у корня, путаница для линтера. Отклонено; фасад — `pub use` в `lib.rs`.

6. **`static_library_models` уходит из application→adapter**  
   Сейчас `catalog/use_cases.rs` импортирует `static_library_models` из того же файла, что и `HttpCatalogLibrary`. После split fallback-данные — domain; HTTP — adapter; trait — port. Use-case по-прежнему ловит ошибку library и подставляет static list (логика 2.3).  
   *Альтернатива:* `StaticCatalogLibrary` adapter и fallback в composition — лишняя косвенность без смены поведения. Отклонено для 2.4.

7. **Публичный API: реэкспорт, не смена JSON**  
   `lib.rs` реэкспортирует `ModelService`, `CatalogService`, `ChatService`, ports, `HttpClient`, `create_provider`, `CoreError`, DTO. Hosts сегодня берут в основном `CRATE_NAME` — риск поломки низкий, но реэкспорт нужен атомам 3.x. Внутренние `use crate::model::…` в тестах обновляются на `crate::domain` / `crate::ports` / реэкспорт.  
   *Альтернатива:* deprecated alias-модули на старых путях — два мира импортов. Отклонено.

8. **Negative/regression gate**  
   - Позитив: `arch_lint::check!()` зелёный на реальном дереве.  
   - Регрессия: `tests/architecture.rs` (или обновлённые сканы) читает `application/**` и падает на `crate::adapters`, `reqwest`, `hyper`, `/api/generate`.  
   - Negative: в `tasks.md` / rustdoc теста зафиксировать сценарий «добавить `use crate::adapters::out::…` в application → `cargo test` красный»; сам AST-линтер — источник истины (не отдельный fixture-crate).  
   *Альтернатива:* отдельный package с заведомо плохим импортом — лишний member workspace. Отклонено.

9. **Hosts и правила Cursor / OpenSpec context**  
   Только rustdoc: server/tauri = driving adapters, без новых routes. Обновить `.cursor/rules/rust-hexagonal-architecture.mdc`: убрать исключение «до завершения 2.4 прагматичная раскладка». В `openspec/config.yaml` `context` — после 2.4 новый код только в hex-слоях; DoD следующих Rust-change = arch-lint + `cargo test -p underlator-core`.  
   *Альтернатива:* workspace-level hex-lint на три crates — рано, core не режут. Отклонено.

10. **Стоимость переноса**  
    Переезд — O(число файлов) правок `mod`/`use`, без копий горячего пути generate (по-прежнему один проход stream + `push_str`). Линтер — dev-only, не в runtime-графе core.

## Risks / Trade-offs

- **`arch-lint` 0.6 не в Context7 / API макроса может отличаться** → Mitigation: читать README/docs.rs при apply; если `check!()` или `except` не закрывают матрицу — тогда и только тогда добавить `rustqual.toml` Architecture как дополнение, не вместо теста.
- **Preset по умолчанию `recommended` включит sync-io** → Mitigation: явно `minimal` + не копировать `arch-lint init` defaults слепо.
- **Публичные пути модулей изменятся** (`underlator_core::http` → реэкспорт) → Mitigation: crate root `pub use`; hosts 3.x ещё не импортируют HTTP/use-cases.
- **String-сканы разъедутся с AST-линтером** → Mitigation: одни и те же запреты в toml и в regression-тесте; не удалять сканы, пока не доказано, что arch-lint ловит те же needle (`reqwest::`, library URL, `/api/generate`).
- **Долгий промежуточный red** (конфиг есть, папок нет) → Mitigation: в одном apply: конфиг → пустые слои → move → зелёный test; не коммитить красный gate отдельно, если пользователь не просит split.

## Migration Plan

- Только внутри `underlator-core` (+ rustdoc hosts, Cursor rule, OpenSpec context). Rollback = revert коммита атома.
- Electron/React не мигрируют. Потребление hex API — атомы 3.x (inbound в hosts).

## Open Questions

Нет.
