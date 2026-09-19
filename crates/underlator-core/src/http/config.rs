//! Конфигурация исходящего HTTP-клиента как данные, без привязки к провайдеру.

use std::fmt;
use std::time::Duration;

/// Политика повторных попыток unary-запросов.
///
/// Значения по умолчанию совпадают с Electron `withRetry`: 3 попытки,
/// базовая задержка 1 с, множитель 2, потолок 10 с.
#[derive(Clone, Debug, PartialEq)]
pub struct RetryPolicy {
    /// Максимальное число попыток, включая первую.
    pub max_attempts: u32,
    /// Задержка после первой неудачной попытки.
    pub base_delay: Duration,
    /// Множитель экспоненциального backoff.
    pub backoff_multiplier: f64,
    /// Верхняя граница задержки между попытками.
    pub max_delay: Duration,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            base_delay: Duration::from_secs(1),
            backoff_multiplier: 2.0,
            max_delay: Duration::from_secs(10),
        }
    }
}

impl RetryPolicy {
    /// Задержка после неудачной попытки `attempt` (1-based).
    pub(crate) fn delay_after(&self, attempt: u32) -> Duration {
        let exp = attempt.saturating_sub(1) as i32;
        let factor = self.backoff_multiplier.powi(exp);
        let millis = self.base_delay.as_secs_f64() * 1000.0 * factor;
        let capped = millis.min(self.max_delay.as_secs_f64() * 1000.0);
        Duration::from_millis(capped.max(0.0) as u64)
    }
}

/// Сведения об аутентификации исходящего запроса.
///
/// Клиент не знает тип LLM-провайдера: это заголовок из данных.
#[derive(Clone, PartialEq, Eq)]
pub enum HttpAuth {
    /// Без заголовка авторизации.
    None,
    /// Заголовок `Authorization: Bearer <token>`.
    Bearer(String),
    /// Произвольная пара имя/значение заголовка.
    Header {
        /// Имя заголовка.
        name: String,
        /// Значение заголовка (не попадает в `Debug`).
        value: String,
    },
}

impl Default for HttpAuth {
    fn default() -> Self {
        Self::None
    }
}

impl fmt::Debug for HttpAuth {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::None => write!(f, "None"),
            Self::Bearer(_) => write!(f, "Bearer([redacted])"),
            Self::Header { name, .. } => f
                .debug_struct("Header")
                .field("name", name)
                .field("value", &"[redacted]")
                .finish(),
        }
    }
}

/// Конфигурация единого исходящего HTTP-клиента ядра.
///
/// Не содержит `provider_id` и вендорных путей (Ollama `/api/generate` и т.п.).
#[derive(Clone)]
pub struct HttpClientConfig {
    /// Базовый URL, относительно которого собираются пути запросов.
    pub base_url: String,
    /// Дополнительные заголовки каждого запроса.
    pub default_headers: Vec<(String, String)>,
    /// Данные аутентификации.
    pub auth: HttpAuth,
    /// Timeout unary-операции и установления stream-ответа.
    pub timeout: Duration,
    /// Политика retry unary и pre-frame stream.
    pub retry: RetryPolicy,
    /// Опциональный proxy URL. `None` — прямой выход.
    pub proxy: Option<String>,
    /// Idle-timeout между кадрами потока (по умолчанию 60 с).
    pub idle_timeout: Duration,
    /// Если `true`, в debug-трассировку попадает тело (auth всё равно редактируется).
    pub trace_bodies: bool,
}

impl Default for HttpClientConfig {
    fn default() -> Self {
        Self {
            base_url: String::new(),
            default_headers: Vec::new(),
            auth: HttpAuth::None,
            timeout: Duration::from_secs(30),
            retry: RetryPolicy::default(),
            proxy: None,
            idle_timeout: Duration::from_secs(60),
            trace_bodies: false,
        }
    }
}

impl fmt::Debug for HttpClientConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("HttpClientConfig")
            .field("base_url", &self.base_url)
            .field("default_headers", &RedactedHeaders(&self.default_headers))
            .field("auth", &self.auth)
            .field("timeout", &self.timeout)
            .field("retry", &self.retry)
            .field("proxy", &self.proxy)
            .field("idle_timeout", &self.idle_timeout)
            .field("trace_bodies", &self.trace_bodies)
            .finish()
    }
}

struct RedactedHeaders<'a>(&'a [(String, String)]);

impl fmt::Debug for RedactedHeaders<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut list = f.debug_list();
        for (name, value) in self.0 {
            if is_sensitive_header(name) {
                list.entry(&(name.as_str(), "[redacted]"));
            } else {
                list.entry(&(name.as_str(), value.as_str()));
            }
        }
        list.finish()
    }
}

/// Имена заголовков, значения которых нельзя писать в `Debug` и трассировку.
pub(crate) fn is_sensitive_header(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().as_str(),
        "authorization" | "proxy-authorization" | "x-api-key" | "api-key"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retry_policy_defaults_match_electron() {
        let policy = RetryPolicy::default();
        assert_eq!(policy.max_attempts, 3);
        assert_eq!(policy.base_delay, Duration::from_secs(1));
        assert_eq!(policy.backoff_multiplier, 2.0);
        assert_eq!(policy.max_delay, Duration::from_secs(10));
        assert_eq!(policy.delay_after(1), Duration::from_secs(1));
        assert_eq!(policy.delay_after(2), Duration::from_secs(2));
        assert_eq!(policy.delay_after(3), Duration::from_secs(4));
        assert_eq!(policy.delay_after(10), Duration::from_secs(10));
    }

    #[test]
    fn debug_redacts_bearer_token() {
        let config = HttpClientConfig {
            base_url: "http://llm.example/base".to_owned(),
            auth: HttpAuth::Bearer("super-secret-token-abc".to_owned()),
            default_headers: vec![("X-Trace".to_owned(), "ok".to_owned())],
            ..Default::default()
        };
        let debug = format!("{config:?}");
        assert!(debug.contains("http://llm.example/base"));
        assert!(debug.contains("Bearer([redacted])"));
        assert!(!debug.contains("super-secret-token-abc"));
        assert!(debug.contains("X-Trace"));
    }
}
