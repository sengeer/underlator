//! Домен `catalog`: контракт и use-cases get / search / getModelInfo.
//!
//! Атом 2.3: локальный список через провайдер, библиотека через
//! [`library::CatalogLibrary`]. Гексагональная раскладка атома 2.4 ещё не выполнена.

pub mod dto;
pub mod library;
pub mod use_cases;

pub use library::{CatalogLibrary, HttpCatalogLibrary, static_library_models};
pub use use_cases::CatalogService;
