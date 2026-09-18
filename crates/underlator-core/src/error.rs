//! Доменные ошибки ядра. Host-слой мапит их в свой транспорт.

use thiserror::Error;

/// Ошибка `underlator-core`.
#[derive(Debug, Error)]
pub enum CoreError {
    /// Внутренняя ошибка инфраструктуры каркаса (не use-case MVP).
    #[error("{0}")]
    Internal(String),
}
