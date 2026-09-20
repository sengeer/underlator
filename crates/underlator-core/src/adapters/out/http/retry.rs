//! Классификация повторяемых сбоев и backoff unary-запросов.

use crate::domain::error::CoreError;

use super::config::RetryPolicy;

/// Временные сбои, которые unary-клиент повторяет: сеть, timeout, 429, 503.
pub(crate) fn is_retryable(err: &CoreError) -> bool {
    match err {
        CoreError::HttpTimeout | CoreError::HttpNetwork(_) => true,
        CoreError::HttpStatus { status, .. } => matches!(*status, 429 | 503),
        _ => false,
    }
}

/// Если retryable-сбой исчерпал попытки, оборачивает его в `HttpRetryExhausted`.
pub(crate) fn finalize(err: CoreError, attempt: u32, max_attempts: u32) -> CoreError {
    if is_retryable(&err) && max_attempts > 1 && attempt >= max_attempts {
        CoreError::HttpRetryExhausted {
            attempts: attempt,
            last: Box::new(err),
        }
    } else {
        err
    }
}

/// Пауза перед следующей попыткой.
pub(crate) async fn sleep_backoff(policy: &RetryPolicy, failed_attempt: u32) {
    tokio::time::sleep(policy.delay_after(failed_attempt)).await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retryable_classes() {
        assert!(is_retryable(&CoreError::HttpTimeout));
        assert!(is_retryable(&CoreError::HttpNetwork("reset".into())));
        assert!(is_retryable(&CoreError::HttpStatus {
            status: 429,
            snippet: String::new(),
        }));
        assert!(is_retryable(&CoreError::HttpStatus {
            status: 503,
            snippet: String::new(),
        }));
        assert!(!is_retryable(&CoreError::HttpStatus {
            status: 400,
            snippet: String::new(),
        }));
        assert!(!is_retryable(&CoreError::HttpStatus {
            status: 404,
            snippet: String::new(),
        }));
        assert!(!is_retryable(&CoreError::HttpConfig("x".into())));
    }
}
