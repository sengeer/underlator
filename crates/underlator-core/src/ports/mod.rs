//! Исходящие порты ядра: traits без runtime-адаптеров.

mod catalog_library;
mod chat_store;
mod llm_provider;

pub use catalog_library::CatalogLibrary;
pub use chat_store::{ChatStore, StorageRoot};
pub use llm_provider::{LlmProvider, ProviderStream};
