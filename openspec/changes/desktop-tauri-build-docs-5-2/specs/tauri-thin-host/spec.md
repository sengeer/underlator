# Spec Delta

## MODIFIED Requirements

### Requirement: Electron parity checklist for MVP scenarios
Атом 5.1 SHALL зафиксировать чеклист сравнения поведения Tauri desktop с Electron на тех же MVP-сценариях `model` / `catalog` / `chat` (happy-path и основные ошибки). Полное удаление Electron / `ElectronTransport` / `electron-app` MUST NOT входить в скоуп. После атома 5.2 unit/mock host-тесты и успешный `cargo tauri dev` MUST NOT считаться заменой shipping-приёмки канонического AppImage на Fedora Workstation 44 (см. capability `desktop-tauri-build`); выпил Electron по-прежнему MUST ждать закрытия 5.2.

#### Scenario: Parity checklist covers MVP surfaces
- **WHEN** DoD атома 5.1 выполняется
- **THEN** MUST существовать явный чеклист (в tasks/приёмке) для generate/stop/install/remove/list, catalog get/search/info и chat CRUD/addMessage
- **AND** MUST NOT требовать удаления `electron-app` или `ElectronTransport`

#### Scenario: Unit and tauri-dev do not waive AppImage shipping gate
- **WHEN** оценивается готовность к атому 6.1 после 5.1
- **THEN** наличие unit/mock тестов host или успешного `tauri dev` MUST NOT считаться закрытием shipping gate атома 5.2
- **AND** MUST NOT начинать удаление Electron, пока `desktop-tauri-build` не принят на Fedora 44 AppImage smoke
