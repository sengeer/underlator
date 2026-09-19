//! Доменные ошибки ядра. Host-слой мапит их в свой транспорт.

use thiserror::Error;

/// Ошибка `underlator-core`.
#[derive(Debug, Error)]
pub enum CoreError {
    /// Внутренняя ошибка инфраструктуры каркаса (не use-case MVP).
    #[error("{0}")]
    Internal(String),
    /// Истекло время ожидания HTTP-операции.
    #[error("истекло время ожидания HTTP-запроса")]
    HttpTimeout,
    /// Сбой сети при исходящем HTTP (соединение, DNS, сброс).
    #[error("сетевой сбой HTTP: {0}")]
    HttpNetwork(String),
    /// Сервер вернул неуспешный HTTP-статус.
    #[error("HTTP-статус {status}")]
    HttpStatus {
        /// Код HTTP-статуса.
        status: u16,
        /// Усечённый фрагмент тела ответа (не полный промпт).
        snippet: String,
    },
    /// Исчерпан лимит повторных попыток unary-запроса.
    #[error("исчерпаны повторы HTTP-запроса после {attempts} попыток: {last}")]
    HttpRetryExhausted {
        /// Число выполненных попыток.
        attempts: u32,
        /// Последняя классифицированная ошибка.
        last: Box<CoreError>,
    },
    /// Обрыв потокового ответа после начала доставки кадров.
    #[error("обрыв HTTP-потока: {0}")]
    HttpStream(String),
    /// Некорректная конфигурация или сборка HTTP-запроса.
    #[error("ошибка конфигурации HTTP: {0}")]
    HttpConfig(String),
}
