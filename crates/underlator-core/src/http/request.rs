//! Данные исходящего HTTP-запроса без типов HTTP-crate.

use bytes::Bytes;
use serde::Serialize;

use crate::error::CoreError;

/// HTTP-метод запроса.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HttpMethod {
    /// GET.
    Get,
    /// POST.
    Post,
    /// PUT.
    Put,
    /// PATCH.
    Patch,
    /// DELETE.
    Delete,
    /// HEAD.
    Head,
}

impl HttpMethod {
    /// Строковое имя метода для трассировки и транспорта.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Get => "GET",
            Self::Post => "POST",
            Self::Put => "PUT",
            Self::Patch => "PATCH",
            Self::Delete => "DELETE",
            Self::Head => "HEAD",
        }
    }
}

/// Описание исходящего запроса: метод, относительный путь, заголовки и тело.
#[derive(Debug, Clone)]
pub struct HttpRequest {
    /// HTTP-метод.
    pub method: HttpMethod,
    /// Путь относительно `HttpClientConfig::base_url`.
    pub path: String,
    /// Query-параметры.
    pub query: Vec<(String, String)>,
    /// Дополнительные заголовки этого запроса.
    pub headers: Vec<(String, String)>,
    /// Необязательное тело (JSON как байты).
    pub body: Option<Bytes>,
}

impl HttpRequest {
    /// Создаёт запрос без тела и заголовков.
    pub fn new(method: HttpMethod, path: impl Into<String>) -> Self {
        Self {
            method,
            path: path.into(),
            query: Vec::new(),
            headers: Vec::new(),
            body: None,
        }
    }

    /// Сериализует значение в JSON-тело запроса.
    pub fn json(mut self, body: &(impl Serialize + ?Sized)) -> Result<Self, CoreError> {
        let bytes = serde_json::to_vec(body).map_err(|err| {
            CoreError::HttpConfig(format!("не удалось сериализовать JSON-тело: {err}"))
        })?;
        self.body = Some(Bytes::from(bytes));
        Ok(self)
    }

    /// Добавляет заголовок запроса.
    pub fn header(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.push((name.into(), value.into()));
        self
    }

    /// Добавляет query-параметр.
    pub fn query(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.query.push((name.into(), value.into()));
        self
    }
}
