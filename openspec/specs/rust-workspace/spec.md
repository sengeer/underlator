# rust-workspace Specification

## Purpose
Описывает каркас Rust monorepo Underlator: Cargo workspace, три crates (core / server / tauri), docker stubs и требования к smoke-сборке без переноса бизнес-логики.

## Requirements

### Requirement: Cargo workspace exists in repository root
The repository SHALL contain a root `Cargo.toml` that defines a Cargo workspace whose members include `crates/underlator-core`, `crates/underlator-server`, and `crates/underlator-tauri`.

#### Scenario: Workspace members are declared
- **WHEN** a developer opens the root `Cargo.toml`
- **THEN** the workspace members list includes exactly those three crate paths as first-class members for the dual-mode backend scaffold

### Requirement: Core library crate boundary
The project SHALL provide `crates/underlator-core` as a Rust library crate that holds shared backend logic and MUST NOT depend on `tauri`, `axum`, or Electron packages.

#### Scenario: Core is a library without host frameworks
- **WHEN** `crates/underlator-core/Cargo.toml` is inspected
- **THEN** the crate is configured as a library and its dependencies do not include `tauri` or `axum`

### Requirement: Server host crate stub
The project SHALL provide `crates/underlator-server` as a binary crate intended for the Docker/web host, depending on `underlator-core`.

#### Scenario: Server depends on core
- **WHEN** `crates/underlator-server/Cargo.toml` is inspected
- **THEN** it declares a binary package and a path dependency on `underlator-core`

### Requirement: Tauri host crate stub
The project SHALL provide `crates/underlator-tauri` as the desktop host crate depending on `underlator-core`, prepared for Tauri 2 integration.

#### Scenario: Tauri crate depends on core
- **WHEN** `crates/underlator-tauri/Cargo.toml` is inspected
- **THEN** it declares a path dependency on `underlator-core`

### Requirement: Docker stubs directory
The repository SHALL include a `docker/` directory with stub `Dockerfile` and `docker-compose` files for the future web delivery mode.

#### Scenario: Docker stubs present
- **WHEN** a developer lists `docker/`
- **THEN** both a Dockerfile stub and a compose stub exist (even if they do not yet build the full UI)

### Requirement: Workspace smoke build
The Rust workspace SHALL compile successfully via `cargo check --workspace` after the scaffold is applied on a properly provisioned machine.

#### Scenario: Smoke check passes
- **WHEN** a developer runs `cargo check --workspace` from the repository root
- **THEN** the command exits successfully for all workspace members

### Requirement: Existing Electron and React apps remain intact
Applying this change MUST NOT remove or break the existing `electron-app` and `react-app` project trees as a required part of the scaffold.

#### Scenario: Legacy apps still present
- **WHEN** the scaffold change is complete
- **THEN** `electron-app/` and `react-app/` directories still exist and are not deleted by this change
