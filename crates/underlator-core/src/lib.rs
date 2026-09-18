//! Ядро Underlator: общая логика dual-mode backend.
//!
//! Crate **не** зависит от `tauri`, `axum` и Electron. Host-слои
//! (`underlator-server`, `underlator-tauri`) только адаптируют вызовы.
//!
//! Каркас атома 1.1: зависимости и границы модулей. Use-cases MVP
//! (`model` / `catalog` / `chat`) и RAG здесь не реализуются.

#![warn(missing_docs)]

pub mod error;
pub mod http;

/// Имя crate ядра.
pub const CRATE_NAME: &str = env!("CARGO_PKG_NAME");

/// Версия crate ядра.
pub const CRATE_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Снимок каркаса для smoke-сериализации (DTO контракта — атом 1.2).
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct ScaffoldInfo {
    /// Имя crate.
    pub name: String,
    /// Версия crate.
    pub version: String,
}

impl ScaffoldInfo {
    /// Текущие имя и версия ядра.
    pub fn current() -> Self {
        Self {
            name: CRATE_NAME.to_owned(),
            version: CRATE_VERSION.to_owned(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crate_identity() {
        assert_eq!(CRATE_NAME, "underlator-core");
        assert!(!CRATE_VERSION.is_empty());
    }

    #[test]
    fn scaffold_info_json_roundtrip() {
        let info = ScaffoldInfo::current();
        let json = serde_json::to_string(&info).expect("сериализация");
        let back: ScaffoldInfo = serde_json::from_str(&json).expect("десериализация");
        assert_eq!(info, back);
    }
}
