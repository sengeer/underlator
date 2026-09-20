//! Абстракция LLM-провайдера: порт, factory и адаптер Ollama.
//!
//! Исходящий HTTP идёт только через [`crate::http::HttpClient`].
//! Use-cases `model` / `catalog` / `chat` в этом модуле не реализуются.

mod config;
mod factory;
mod ollama;
mod port;
mod stub;

pub use config::ProviderFactoryConfig;
pub use factory::create_provider;
pub use ollama::OllamaProvider;
pub use port::{LlmProvider, ProviderStream};
pub use stub::UnsupportedProvider;

#[cfg(test)]
mod tests;
