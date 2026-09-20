//! Исходящие адаптеры LLM: runtime Ollama, облачные stubs и factory.
//!
//! Исходящий HTTP идёт только через [`crate::adapters::out::http::HttpClient`].
//! Factory собирается в этом слое, не в `application`.

mod config;
mod factory;
mod provider;
mod stub;

pub use config::ProviderFactoryConfig;
pub use factory::create_provider;
pub use provider::OllamaProvider;
pub use stub::UnsupportedProvider;

#[cfg(test)]
mod tests;
