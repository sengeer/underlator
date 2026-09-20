//! Унифицированный исходящий HTTP-клиент ядра.
//!
//! Единственная точка сетевого I/O для будущих провайдеров и use-cases.
//! Типы `reqwest` / `hyper` не реэкспортируются.

mod config;
mod request;
mod retry;
mod stream;
mod trace;

pub use config::{HttpAuth, HttpClientConfig, RetryPolicy};
pub use request::{HttpMethod, HttpRequest};
pub use stream::{HttpByteStream, StreamMode};

use std::sync::Arc;
use std::time::Instant;

use bytes::Bytes;
use reqwest::Client;
use serde::Serialize;
use serde::de::DeserializeOwned;

use crate::error::CoreError;

use self::config::HttpAuth as Auth;
use self::request::HttpRequest as OutboundRequest;

/// Максимальная длина фрагмента тела в `HttpStatus`.
const ERROR_SNIPPET_MAX: usize = 512;

/// Унифицированный исходящий HTTP-клиент.
#[derive(Clone, Debug)]
pub struct HttpClient {
    inner: Client,
    config: Arc<HttpClientConfig>,
}

impl HttpClient {
    /// Собирает клиент с конфигурацией по умолчанию. Сеть не используется.
    pub fn new() -> Result<Self, CoreError> {
        Self::from_config(HttpClientConfig::default())
    }

    /// Собирает клиент из конфигурации-данных (base URL, headers, auth, timeout, retry, proxy).
    pub fn from_config(config: HttpClientConfig) -> Result<Self, CoreError> {
        if config.retry.max_attempts == 0 {
            return Err(CoreError::HttpConfig(
                "RetryPolicy.max_attempts должен быть ≥ 1".to_owned(),
            ));
        }
        if config.timeout.is_zero() {
            return Err(CoreError::HttpConfig(
                "timeout HTTP-клиента должен быть > 0".to_owned(),
            ));
        }

        tracing::debug!(crate = crate::CRATE_NAME, "сборка HTTP-клиента ядра");
        let mut builder = Client::builder().user_agent(user_agent());

        if let Some(proxy_url) = config.proxy.as_deref() {
            let proxy = reqwest::Proxy::all(proxy_url)
                .map_err(|err| CoreError::HttpConfig(format!("некорректный proxy URL: {err}")))?;
            builder = builder.proxy(proxy);
        }

        let inner = builder
            .build()
            .map_err(|err| CoreError::HttpConfig(err.to_string()))?;
        Ok(Self {
            inner,
            config: Arc::new(config),
        })
    }

    /// Выполняет unary JSON-запрос: метод, относительный путь и JSON-тело.
    pub async fn send_json<B, T>(
        &self,
        method: HttpMethod,
        path: &str,
        body: &B,
    ) -> Result<T, CoreError>
    where
        B: Serialize + ?Sized,
        T: DeserializeOwned,
    {
        let request = OutboundRequest::new(method, path).json(body)?;
        let bytes = self.send_unary_bytes(&request).await?;
        decode_json_body(&bytes)
    }

    /// Как `send_json`, но пустое 2xx-тело даёт `T::default()` вместо ошибки serde.
    ///
    /// Вендорные пути не входят в API: метод и относительный путь задаёт вызывающий код.
    pub async fn send_json_or_empty<B, T>(
        &self,
        method: HttpMethod,
        path: &str,
        body: &B,
    ) -> Result<T, CoreError>
    where
        B: Serialize + ?Sized,
        T: DeserializeOwned + Default,
    {
        let request = OutboundRequest::new(method, path).json(body)?;
        let bytes = self.send_unary_bytes(&request).await?;
        if is_empty_http_body(&bytes) {
            Ok(T::default())
        } else {
            decode_json_body(&bytes)
        }
    }

    /// Выполняет unary-запрос по уже собранному [`HttpRequest`].
    ///
    /// Тело необязательно: подходит для GET без JSON (источник каталога).
    pub async fn send(&self, request: OutboundRequest) -> Result<Bytes, CoreError> {
        self.send_unary_bytes(&request).await
    }

    /// Выполняет потоковый запрос и отдаёт кадры выбранного режима.
    pub async fn send_stream(
        &self,
        request: OutboundRequest,
        mode: StreamMode,
    ) -> Result<HttpByteStream, CoreError> {
        let response = self.send_stream_response(&request).await?;
        Ok(HttpByteStream::from_byte_stream(
            response.bytes_stream(),
            mode,
            self.config.idle_timeout,
        ))
    }

    async fn send_unary_bytes(&self, request: &OutboundRequest) -> Result<Bytes, CoreError> {
        let max = self.config.retry.max_attempts;
        let mut attempt = 1;
        loop {
            match self.unary_attempt(request, attempt).await {
                Ok(bytes) => return Ok(bytes),
                Err(err) => {
                    if retry::is_retryable(&err) && attempt < max {
                        retry::sleep_backoff(&self.config.retry, attempt).await;
                        attempt += 1;
                        continue;
                    }
                    return Err(retry::finalize(err, attempt, max));
                }
            }
        }
    }

    async fn unary_attempt(
        &self,
        request: &OutboundRequest,
        attempt: u32,
    ) -> Result<Bytes, CoreError> {
        let built = self.build_request(request)?;
        let method = request.method.as_str();
        let host = built.url().host_str().unwrap_or("").to_owned();
        let path = built.url().path().to_owned();
        if self.config.trace_bodies {
            if let Some(body) = request.body.as_deref() {
                trace::emit_body_if_enabled(true, body);
            }
        }
        let started = Instant::now();
        let timed = tokio::time::timeout(self.config.timeout, async {
            let response = self.inner.execute(built).await.map_err(map_reqwest)?;
            let status = response.status().as_u16();
            let body = response.bytes().await.map_err(map_reqwest)?;
            Ok::<_, CoreError>((status, body))
        })
        .await;

        match timed {
            Err(_) => {
                trace::emit_attempt(method, &host, &path, None, started.elapsed(), attempt);
                Err(CoreError::HttpTimeout)
            }
            Ok(Err(err)) => {
                trace::emit_attempt(method, &host, &path, None, started.elapsed(), attempt);
                Err(err)
            }
            Ok(Ok((status, body))) => {
                trace::emit_attempt(
                    method,
                    &host,
                    &path,
                    Some(status),
                    started.elapsed(),
                    attempt,
                );
                if (200..300).contains(&status) {
                    Ok(body)
                } else {
                    Err(CoreError::HttpStatus {
                        status,
                        snippet: truncate_snippet(&body),
                    })
                }
            }
        }
    }

    async fn send_stream_response(
        &self,
        request: &OutboundRequest,
    ) -> Result<reqwest::Response, CoreError> {
        let max = self.config.retry.max_attempts;
        let mut attempt = 1;
        loop {
            match self.stream_handshake(request, attempt).await {
                Ok(response) => return Ok(response),
                Err(err) => {
                    if retry::is_retryable(&err) && attempt < max {
                        retry::sleep_backoff(&self.config.retry, attempt).await;
                        attempt += 1;
                        continue;
                    }
                    return Err(retry::finalize(err, attempt, max));
                }
            }
        }
    }

    async fn stream_handshake(
        &self,
        request: &OutboundRequest,
        attempt: u32,
    ) -> Result<reqwest::Response, CoreError> {
        let built = self.build_request(request)?;
        let method = request.method.as_str();
        let host = built.url().host_str().unwrap_or("").to_owned();
        let path = built.url().path().to_owned();
        let started = Instant::now();
        let timed = tokio::time::timeout(self.config.timeout, self.inner.execute(built)).await;

        match timed {
            Err(_) => {
                trace::emit_attempt(method, &host, &path, None, started.elapsed(), attempt);
                Err(CoreError::HttpTimeout)
            }
            Ok(Err(err)) => {
                trace::emit_attempt(method, &host, &path, None, started.elapsed(), attempt);
                Err(map_reqwest(err))
            }
            Ok(Ok(response)) => {
                let status = response.status().as_u16();
                trace::emit_attempt(
                    method,
                    &host,
                    &path,
                    Some(status),
                    started.elapsed(),
                    attempt,
                );
                if (200..300).contains(&status) {
                    Ok(response)
                } else {
                    let body = response.bytes().await.unwrap_or_default();
                    Err(CoreError::HttpStatus {
                        status,
                        snippet: truncate_snippet(&body),
                    })
                }
            }
        }
    }

    fn build_request(&self, request: &OutboundRequest) -> Result<reqwest::Request, CoreError> {
        let url = join_url(&self.config.base_url, &request.path, &request.query)?;
        let method = reqwest::Method::from_bytes(request.method.as_str().as_bytes())
            .map_err(|err| CoreError::HttpConfig(format!("некорректный HTTP-метод: {err}")))?;
        let mut builder = self.inner.request(method, url);

        for (name, value) in &self.config.default_headers {
            builder = builder.header(name.as_str(), value.as_str());
        }
        match &self.config.auth {
            Auth::None => {}
            Auth::Bearer(token) => {
                builder = builder.header("Authorization", format!("Bearer {token}"));
            }
            Auth::Header { name, value } => {
                builder = builder.header(name.as_str(), value.as_str());
            }
        }
        for (name, value) in &request.headers {
            builder = builder.header(name.as_str(), value.as_str());
        }

        if let Some(body) = &request.body {
            builder = builder
                .header("Content-Type", "application/json")
                .body(body.clone());
        }

        builder
            .build()
            .map_err(|err| CoreError::HttpConfig(err.to_string()))
    }
}

/// User-agent исходящих запросов ядра.
pub fn user_agent() -> String {
    format!("{}/{}", crate::CRATE_NAME, crate::CRATE_VERSION)
}

pub(crate) fn map_reqwest(err: reqwest::Error) -> CoreError {
    if err.is_timeout() {
        return CoreError::HttpTimeout;
    }
    if err.is_builder() {
        return CoreError::HttpConfig(err.to_string());
    }
    CoreError::HttpNetwork(err.to_string())
}

fn join_url(base: &str, path: &str, query: &[(String, String)]) -> Result<reqwest::Url, CoreError> {
    if base.trim().is_empty() {
        return Err(CoreError::HttpConfig("не задан base URL".to_owned()));
    }
    let mut base = base.to_owned();
    if !base.ends_with('/') {
        base.push('/');
    }
    let mut url = reqwest::Url::parse(&base)
        .map_err(|err| CoreError::HttpConfig(format!("некорректный base URL: {err}")))?;
    let rel = path.trim_start_matches('/');
    url = url
        .join(rel)
        .map_err(|err| CoreError::HttpConfig(format!("некорректный путь HTTP: {err}")))?;
    if !query.is_empty() {
        let mut pairs = url.query_pairs_mut();
        for (key, value) in query {
            pairs.append_pair(key, value);
        }
    }
    Ok(url)
}

fn decode_json_body<T: DeserializeOwned>(bytes: &Bytes) -> Result<T, CoreError> {
    serde_json::from_slice(bytes)
        .map_err(|err| CoreError::Internal(format!("не удалось разобрать JSON-ответ: {err}")))
}

fn is_empty_http_body(bytes: &Bytes) -> bool {
    bytes.is_empty() || bytes.iter().all(u8::is_ascii_whitespace)
}

fn truncate_snippet(body: &[u8]) -> String {
    let text = String::from_utf8_lossy(body);
    let mut snippet: String = text.chars().take(ERROR_SNIPPET_MAX).collect();
    if text.chars().count() > ERROR_SNIPPET_MAX {
        snippet.push('…');
    }
    snippet
}

#[cfg(test)]
mod tests;
