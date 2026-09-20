//! Трассировка исходящих HTTP-запросов без тел и секретов по умолчанию.

use std::time::Duration;

/// Пишет событие об одной попытке: метод, host, path, статус, длительность.
pub(crate) fn emit_attempt(
    method: &str,
    host: &str,
    path: &str,
    status: Option<u16>,
    duration: Duration,
    attempt: u32,
) {
    tracing::info!(
        method,
        host,
        path,
        status,
        duration_ms = duration.as_millis() as u64,
        attempt,
        "http_request"
    );
}

/// Debug-трассировка тела, если явно включена. Секретные заголовки не логируются.
pub(crate) fn emit_body_if_enabled(enabled: bool, body: &[u8]) {
    if !enabled {
        return;
    }
    let preview = String::from_utf8_lossy(body);
    tracing::debug!(body_len = body.len(), body = %preview, "http_request_body");
}
