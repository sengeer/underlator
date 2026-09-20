//! Исходящие адаптеры: HTTP-клиент, LLM, filesystem/memory store, library HTTP.

pub mod catalog_library;
pub mod fs;
pub mod http;
pub mod memory;
pub mod ollama;

pub use catalog_library::HttpCatalogLibrary;
pub use fs::FilesystemChatStore;
pub use memory::MemoryChatStore;
