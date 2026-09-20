//! Use-cases MVP: зависят только от `ports` и `domain`.

mod catalog;
mod chat;
mod model;

pub use catalog::CatalogService;
pub use chat::{ChatService, Clock, IdGenerator, SystemClock, TickClock, UuidIdGenerator};
pub use model::ModelService;
