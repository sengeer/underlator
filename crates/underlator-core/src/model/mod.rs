//! Домен `model`: контракт и use-cases generate / stop / install / remove / list.
//!
//! Атом 2.3: исполняемые сервисы через [`crate::provider::LlmProvider`].
//! Гексагональная раскладка атома 2.4 ещё не выполнена.

pub mod dto;
pub mod use_cases;

pub use use_cases::ModelService;
