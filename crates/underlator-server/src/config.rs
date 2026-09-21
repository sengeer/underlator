//! Конфигурация docker/web-host из переменных окружения.

use std::net::SocketAddr;
use std::path::PathBuf;

use underlator_core::{DEFAULT_PROVIDER_ID, DEFAULT_PROVIDER_URL, ProviderConfig};

use crate::BIND_ADDR;

/// Ошибка политики bind (fail-closed на публичный адрес без секрета).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConfigError {
    /// Не-loopback bind без token/basic.
    PublicBindWithoutAuth {
        /// Запрошенный адрес `host:port`.
        bind: String,
    },
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PublicBindWithoutAuth { bind } => {
                write!(
                    f,
                    "публичный bind `{bind}` требует UNDERLATOR_AUTH_TOKEN или пару UNDERLATOR_AUTH_USER и UNDERLATOR_AUTH_PASSWORD"
                )
            }
        }
    }
}

impl std::error::Error for ConfigError {}

/// Параметры процесса `underlator-server`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ServerConfig {
    /// Адрес `host:port` для `TcpListener`.
    pub bind: String,
    /// Корень данных чатов (`StorageRoot`).
    pub data_dir: PathBuf,
    /// Идентификатор и URL провайдера для `create_provider`.
    pub provider: ProviderConfig,
    /// Каталог production-сборки UI; `None` — static не отдаётся.
    pub static_dir: Option<PathBuf>,
    /// Shared Bearer-токен.
    pub auth_token: Option<String>,
    /// Имя пользователя HTTP Basic.
    pub auth_user: Option<String>,
    /// Пароль HTTP Basic.
    pub auth_password: Option<String>,
}

impl ServerConfig {
    /// Читает конфиг из окружения процесса.
    pub fn from_env() -> Self {
        Self::from_get(|key| std::env::var(key).ok().filter(|value| !value.is_empty()))
    }

    /// Собирает конфиг из функции чтения переменных (удобно для тестов).
    pub fn from_get<F>(mut get: F) -> Self
    where
        F: FnMut(&str) -> Option<String>,
    {
        let bind = get("UNDERLATOR_BIND").unwrap_or_else(|| BIND_ADDR.to_owned());
        let data_dir =
            PathBuf::from(get("UNDERLATOR_DATA_DIR").unwrap_or_else(|| "./data".to_owned()));
        let provider = ProviderConfig {
            id: get("UNDERLATOR_PROVIDER_ID").unwrap_or_else(|| DEFAULT_PROVIDER_ID.to_owned()),
            url: get("OLLAMA_BASE_URL").unwrap_or_else(|| DEFAULT_PROVIDER_URL.to_owned()),
        };
        let static_dir = get("UNDERLATOR_STATIC_DIR").map(PathBuf::from);
        Self {
            bind,
            data_dir,
            provider,
            static_dir,
            auth_token: get("UNDERLATOR_AUTH_TOKEN"),
            auth_user: get("UNDERLATOR_AUTH_USER"),
            auth_password: get("UNDERLATOR_AUTH_PASSWORD"),
        }
    }

    /// Есть ли настроенный shared secret (Bearer и/или полная пара Basic).
    pub fn has_secret(&self) -> bool {
        non_empty(self.auth_token.as_deref()) || self.has_basic()
    }

    /// Задана ли пара user/password для HTTP Basic.
    pub fn has_basic(&self) -> bool {
        non_empty(self.auth_user.as_deref()) && non_empty(self.auth_password.as_deref())
    }

    /// Fail-closed: публичный bind без секрета — ошибка до `TcpListener::bind`.
    pub fn ensure_bind_policy(&self) -> Result<(), ConfigError> {
        if !bind_is_loopback(&self.bind) && !self.has_secret() {
            return Err(ConfigError::PublicBindWithoutAuth {
                bind: self.bind.clone(),
            });
        }
        Ok(())
    }
}

fn non_empty(value: Option<&str>) -> bool {
    value.is_some_and(|item| !item.is_empty())
}

/// `true`, если bind указывает на loopback (`127.0.0.1`, `::1`, `localhost`).
pub fn bind_is_loopback(bind: &str) -> bool {
    let bind = bind.trim();
    if let Ok(addr) = bind.parse::<SocketAddr>() {
        return addr.ip().is_loopback();
    }
    let host = extract_host(bind);
    host.eq_ignore_ascii_case("localhost") || host == "127.0.0.1" || host == "::1"
}

fn extract_host(bind: &str) -> &str {
    if let Some(rest) = bind.strip_prefix('[') {
        return rest.split(']').next().unwrap_or(bind);
    }
    bind.rsplit_once(':').map(|(host, _)| host).unwrap_or(bind)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_env_uses_loopback_defaults() {
        let config = ServerConfig::from_get(|_| None);
        assert_eq!(config.bind, BIND_ADDR);
        assert_eq!(config.bind, "127.0.0.1:8080");
        assert_eq!(config.data_dir, PathBuf::from("./data"));
        assert_eq!(config.provider.id, "ollama");
        assert_eq!(config.provider.url, "http://127.0.0.1:11434");
        assert!(config.static_dir.is_none());
        assert!(!config.has_secret());
        assert!(config.ensure_bind_policy().is_ok());
    }

    #[test]
    fn ollama_base_url_overrides_provider_url() {
        let config = ServerConfig::from_get(|key| {
            (key == "OLLAMA_BASE_URL").then(|| "http://ollama:11434".to_owned())
        });
        assert_eq!(config.provider.url, "http://ollama:11434");
        assert_eq!(config.provider.id, "ollama");
    }

    #[test]
    fn public_bind_without_secret_is_error() {
        let mut config = ServerConfig::from_get(|_| None);
        config.bind = "0.0.0.0:8080".to_owned();
        assert!(matches!(
            config.ensure_bind_policy(),
            Err(ConfigError::PublicBindWithoutAuth { .. })
        ));
    }

    #[test]
    fn loopback_bind_without_secret_is_ok() {
        let mut config = ServerConfig::from_get(|_| None);
        config.bind = "127.0.0.1:8080".to_owned();
        assert!(config.ensure_bind_policy().is_ok());
    }

    #[test]
    fn public_bind_with_token_is_ok() {
        let config = ServerConfig::from_get(|key| match key {
            "UNDERLATOR_BIND" => Some("0.0.0.0:8080".to_owned()),
            "UNDERLATOR_AUTH_TOKEN" => Some("dev-token".to_owned()),
            _ => None,
        });
        assert!(config.ensure_bind_policy().is_ok());
    }
}
