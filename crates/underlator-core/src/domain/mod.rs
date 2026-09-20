//! Доменный слой: DTO, события, ошибки и заготовки без IO.
//!
//! Не импортирует `adapters`, `reqwest` и `hyper`.

pub mod catalog;
pub mod chat;
pub mod contract;
pub mod error;
pub mod events;
pub mod host_error;
pub(crate) mod iso8601;
pub mod model;
pub mod rag;
pub mod splash;

pub use error::CoreError;
pub use host_error::{HostErrorClass, host_error_class};
