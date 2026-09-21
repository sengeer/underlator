//! Заготовка auth: shared Bearer и/или HTTP Basic на `/api/*`.

use axum::extract::{Request, State};
use axum::http::{HeaderMap, StatusCode, header};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};

use crate::state::AppState;

/// Пропускает запрос к `/api/*`, если секрет не задан или заголовок валиден.
pub async fn require_api_auth(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    if !state.auth_enabled() {
        return next.run(request).await;
    }
    if credentials_ok(request.headers(), &state) {
        return next.run(request).await;
    }
    let mut response = StatusCode::UNAUTHORIZED.into_response();
    if state.has_basic() {
        response.headers_mut().insert(
            header::WWW_AUTHENTICATE,
            header::HeaderValue::from_static("Basic realm=\"underlator\""),
        );
    } else {
        response.headers_mut().insert(
            header::WWW_AUTHENTICATE,
            header::HeaderValue::from_static("Bearer"),
        );
    }
    response
}

fn credentials_ok(headers: &HeaderMap, state: &AppState) -> bool {
    let Some(raw) = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
    else {
        return false;
    };
    let token = state.auth_token();
    if !token.is_empty()
        && let Some(provided) = raw.strip_prefix("Bearer ")
        && provided == token
    {
        return true;
    }
    if state.has_basic()
        && let Some(provided) = raw.strip_prefix("Basic ")
    {
        let expected = encode_basic(state.auth_user(), state.auth_password());
        return provided == expected;
    }
    false
}

/// Standard Base64 (алфавит RFC 4648) для заголовка Basic.
fn encode_basic(user: &str, password: &str) -> String {
    base64_encode(format!("{user}:{password}").as_bytes())
}

fn base64_encode(input: &[u8]) -> String {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    let mut chunks = input.chunks_exact(3);
    for chunk in chunks.by_ref() {
        let n = ((chunk[0] as u32) << 16) | ((chunk[1] as u32) << 8) | (chunk[2] as u32);
        out.push(TABLE[((n >> 18) & 0x3f) as usize] as char);
        out.push(TABLE[((n >> 12) & 0x3f) as usize] as char);
        out.push(TABLE[((n >> 6) & 0x3f) as usize] as char);
        out.push(TABLE[(n & 0x3f) as usize] as char);
    }
    let rem = chunks.remainder();
    if rem.len() == 1 {
        let n = (rem[0] as u32) << 16;
        out.push(TABLE[((n >> 18) & 0x3f) as usize] as char);
        out.push(TABLE[((n >> 12) & 0x3f) as usize] as char);
        out.push('=');
        out.push('=');
    } else if rem.len() == 2 {
        let n = ((rem[0] as u32) << 16) | ((rem[1] as u32) << 8);
        out.push(TABLE[((n >> 18) & 0x3f) as usize] as char);
        out.push(TABLE[((n >> 12) & 0x3f) as usize] as char);
        out.push(TABLE[((n >> 6) & 0x3f) as usize] as char);
        out.push('=');
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_encoder_matches_known_vector() {
        assert_eq!(
            encode_basic("Aladdin", "open sesame"),
            "QWxhZGRpbjpvcGVuIHNlc2FtZQ=="
        );
    }
}
