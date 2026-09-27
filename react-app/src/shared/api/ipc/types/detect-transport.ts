/**
 * @module DetectTransportTypes
 * Типы выбора режима BackendClient (явный флаг vs runtime detect).
 */

/** Режим транспорта BackendClient. */
export type BackendMode = 'http' | 'electron' | 'tauri';

/** Глобали для detect без обязательного DOM. */
export interface DetectTransportGlobals {
  /** Preload API Electron (`window.electron`). */
  electron?: unknown;
  /** Tauri 1.x global. */
  __TAURI__?: unknown;
  /** Tauri 2 internals. */
  __TAURI_INTERNALS__?: unknown;
}
