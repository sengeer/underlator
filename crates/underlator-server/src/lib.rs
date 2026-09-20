//! HTTP-host Underlator (Docker / web): **driving adapter** над `underlator-core`.
//!
//! Разбор HTTP-входа → вызов application/ports API ядра → сериализация ответа.
//! Доменные правила и исходящий HTTP к LLM здесь не живут. MVP routes
//! (`model` / `catalog` / `chat`) в этом атоме не объявляются.

#![warn(missing_docs)]

use axum::{Router, routing::get};
use underlator_core::CRATE_NAME;

/// Адрес bind каркаса (loopback). Публичный `0.0.0.0` — после auth.
pub const BIND_ADDR: &str = "127.0.0.1:8080";

/// Собирает каркасный роутер без use-cases MVP.
pub fn router() -> Router {
    Router::new().route("/healthz", get(healthz))
}

async fn healthz() -> &'static str {
    CRATE_NAME
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn router_builds() {
        let _ = router();
    }

    #[test]
    fn host_depends_on_core() {
        assert_eq!(underlator_core::CRATE_NAME, "underlator-core");
    }
}
