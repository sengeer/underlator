//! Конфигурация desktop-host: провайдер и каталог данных.

use std::path::PathBuf;

use underlator_core::{DEFAULT_PROVIDER_ID, DEFAULT_PROVIDER_URL, ProviderConfig};

/// Параметры процесса `underlator-tauri`.
///
/// Default URL — локальный Ollama на машине пользователя
/// (`http://127.0.0.1:11434`), не docker DNS `http://ollama:11434`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopConfig {
    /// Идентификатор и URL провайдера для `create_provider`.
    pub provider: ProviderConfig,
    /// Явный override корня данных чатов; `None` — app data dir Tauri.
    pub data_dir_override: Option<PathBuf>,
}

impl DesktopConfig {
    /// Читает конфиг из окружения процесса.
    pub fn from_env() -> Self {
        Self::from_get(|key| std::env::var(key).ok().filter(|value| !value.is_empty()))
    }

    /// Собирает конфиг из функции чтения переменных (удобно для тестов).
    pub fn from_get<F>(mut get: F) -> Self
    where
        F: FnMut(&str) -> Option<String>,
    {
        let provider = ProviderConfig {
            id: get("UNDERLATOR_PROVIDER_ID").unwrap_or_else(|| DEFAULT_PROVIDER_ID.to_owned()),
            url: get("OLLAMA_BASE_URL").unwrap_or_else(|| DEFAULT_PROVIDER_URL.to_owned()),
        };
        let data_dir_override = get("UNDERLATOR_DATA_DIR").map(PathBuf::from);
        Self {
            provider,
            data_dir_override,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_env_uses_local_ollama_defaults() {
        let config = DesktopConfig::from_get(|_| None);
        assert_eq!(config.provider.id, "ollama");
        assert_eq!(config.provider.url, "http://127.0.0.1:11434");
        assert!(config.data_dir_override.is_none());
        assert_ne!(config.provider.url, "http://ollama:11434");
    }

    #[test]
    fn ollama_base_url_overrides_provider_url() {
        let config = DesktopConfig::from_get(|key| {
            (key == "OLLAMA_BASE_URL").then(|| "http://127.0.0.1:11435".to_owned())
        });
        assert_eq!(config.provider.url, "http://127.0.0.1:11435");
        assert_eq!(config.provider.id, "ollama");
    }

    #[test]
    fn data_dir_override_from_env() {
        let config = DesktopConfig::from_get(|key| {
            (key == "UNDERLATOR_DATA_DIR").then(|| "/tmp/underlator-test".to_owned())
        });
        assert_eq!(
            config.data_dir_override.as_deref(),
            Some(std::path::Path::new("/tmp/underlator-test"))
        );
    }
}
