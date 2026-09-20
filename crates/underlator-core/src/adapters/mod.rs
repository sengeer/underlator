//! Адаптеры ядра.
//!
//! Inbound (driving) adapters живут в host-crates (`underlator-server`,
//! `underlator-tauri`). Здесь — только исходящий IO.

pub mod out;
