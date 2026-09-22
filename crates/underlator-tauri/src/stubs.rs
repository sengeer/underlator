//! Desktop-only заготовки: mailto / native dialogs.
//!
//! **Не блокер MVP** `model` / `catalog` / `chat`. Splash и embedded Ollama —
//! явно later: runtime installer / splash lifecycle здесь **не** реализованы.

/// Открыть `mailto:` (заготовка; не входит в MVP DoD).
///
/// Позже: `tauri-plugin-opener` / системный handler.
pub fn mailto_stub(address: &str) -> Result<(), String> {
    let _ = address;
    Err("mailto: заготовка desktop-only; не блокер MVP".to_owned())
}

/// Нативный диалог выбора файла (заготовка; не входит в MVP DoD).
///
/// Позже: `tauri-plugin-dialog`.
pub fn open_file_dialog_stub() -> Result<Option<String>, String> {
    Err("native dialog: заготовка desktop-only; не блокер MVP".to_owned())
}

/// Splash / embedded Ollama — **later**, без runtime в атоме 5.1.
///
/// См. architectural plan §5.1 / out of scope MVP dual-mode.
pub fn splash_and_embedded_ollama_later() {
    // no-op: explicit later, no runtime
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stubs_do_not_gate_mvp() {
        assert!(mailto_stub("a@b.c").is_err());
        assert!(open_file_dialog_stub().is_err());
        splash_and_embedded_ollama_later();
    }
}
