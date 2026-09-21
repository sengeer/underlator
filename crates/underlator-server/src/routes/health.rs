//! Проба живости без вызова LLM.

use underlator_core::CRATE_NAME;

/// `GET /healthz` — процесс жив, Ollama не требуется.
pub async fn healthz() -> &'static str {
    CRATE_NAME
}
