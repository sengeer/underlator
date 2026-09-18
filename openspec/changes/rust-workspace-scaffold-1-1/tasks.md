# Tasks

## 1. Cargo workspace и crates

- [ ] 1.1 Создать корневой `Cargo.toml` (workspace) и при необходимости корневой `.gitignore` с `target/`
- [ ] 1.2 Создать `crates/underlator-core` (library) с базовыми deps: `tokio`, `serde`, `thiserror`, `tracing`, HTTP-стек
- [ ] 1.3 Создать `crates/underlator-server` (binary stub, Axum в deps, зависит от core)
- [ ] 1.4 Создать `crates/underlator-tauri` (Tauri 2 host stub, зависит от core)
- [ ] 1.5 Проверить границы: core не зависит от `tauri`/`axum`; host-crates зависят от core

## 2. Docker stubs

- [ ] 2.1 Добавить `docker/Dockerfile` (stub / placeholder под будущий server + static UI)
- [ ] 2.2 Добавить `docker/docker-compose.yml` (stub: server + Ollama, volume для данных)

## 3. Совместимость и проверка (DoD)

- [ ] 3.1 Убедиться, что `electron-app/` и `react-app/` не удалены и не требуют правок для этого атома
- [ ] 3.2 Выполнить `cargo check --workspace` успешно
- [ ] 3.3 Кратко перечислить созданные пути в ответе агента

## Definition of Done (DoD)

Change `rust-workspace-scaffold-1-1` считается выполненным **только если** все пункты ниже истинны:

1. Существуют: корневой workspace `Cargo.toml`, `crates/underlator-core`, `crates/underlator-server`, `crates/underlator-tauri`
2. Существуют stubs: `docker/Dockerfile`, `docker/docker-compose.yml` (или `.yaml`)
3. `cargo check --workspace` завершается с кодом `0`
4. `underlator-core` не зависит от `tauri` и `axum`
5. `electron-app/` и `react-app/` на месте
6. Не реализованы MVP use-cases (`model`/`catalog`/`chat`) и RAG — только каркас
7. Все чекбоксы в этом `tasks.md` отмечены `[x]`

## Out of scope (явно не делать)

- Атом `1.2` (DTO из preload)
- Перенос Ollama/chat/catalog логики
- Выпил Electron
- Полная сборка Docker-образа с UI
- Изменение поведения React UI
