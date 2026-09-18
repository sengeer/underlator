//! HTTP-стек ядра на `reqwest`.
//!
//! Будущие use-cases не должны ходить в сеть в обход этого модуля.
//! Полноценный клиент (timeout, retry, streaming) — атом 2.1.

use reqwest::Client;

use crate::error::CoreError;

/// Заготовка унифицированного HTTP-клиента.
#[derive(Clone, Debug)]
pub struct HttpClient {
    /// Удерживается до атома 2.1 (timeout, retry, streaming).
    #[allow(dead_code)]
    inner: Client,
}

impl HttpClient {
    /// Собирает `reqwest::Client` с user-agent ядра. Сеть не используется.
    pub fn new() -> Result<Self, CoreError> {
        tracing::debug!(crate = crate::CRATE_NAME, "сборка HTTP-клиента каркаса");
        let inner = Client::builder()
            .user_agent(user_agent())
            .build()
            .map_err(|err| CoreError::Internal(err.to_string()))?;
        Ok(Self { inner })
    }
}

/// User-agent исходящих запросов ядра.
pub fn user_agent() -> String {
    format!("{}/{}", crate::CRATE_NAME, crate::CRATE_VERSION)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn client_builds_without_network() {
        let client = HttpClient::new().expect("клиент собирается без I/O");
        let _ = client;
    }

    #[test]
    fn user_agent_uses_crate_identity() {
        assert_eq!(
            user_agent(),
            format!("{}/{}", crate::CRATE_NAME, crate::CRATE_VERSION)
        );
    }
}
