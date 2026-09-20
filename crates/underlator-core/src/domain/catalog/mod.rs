//! DTO каталога и статический fallback-список библиотеки (без HTTP).

pub mod dto;
mod static_library;

pub use dto::*;
pub use static_library::static_library_models;
