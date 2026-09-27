/**
 * @module DetectTransport
 * Выбор транспорта: явный `VITE_BACKEND_MODE` побеждает runtime detect.
 */

import type {
  BackendMode,
  DetectTransportGlobals,
} from '../types/detect-transport';

export type { BackendMode, DetectTransportGlobals };

/**
 * Читает host-глобали из `window` (пусто вне браузера).
 *
 * @returns Снимок Electron/Tauri globals.
 */
function readWindowGlobals(): DetectTransportGlobals {
  if (typeof window === 'undefined') {
    return {};
  }
  const win = window as Window & DetectTransportGlobals;
  return {
    electron: win.electron,
    __TAURI__: win.__TAURI__,
    __TAURI_INTERNALS__: win.__TAURI_INTERNALS__,
  };
}

/**
 * Определяет режим транспорта.
 *
 * @param mode - Явный флаг (`http`/`electron`/`tauri`); пустой = detect.
 * @param globals - Window-глобали (по умолчанию `window`).
 * @returns Режим BackendClient.
 */
export function detectTransport(
  mode: string | undefined = import.meta.env.VITE_BACKEND_MODE,
  globals: DetectTransportGlobals = readWindowGlobals()
): BackendMode {
  const explicit = mode?.trim();
  if (explicit === 'http' || explicit === 'electron' || explicit === 'tauri') {
    return explicit;
  }
  if (globals.__TAURI_INTERNALS__ || globals.__TAURI__) {
    return 'tauri';
  }
  if (globals.electron) {
    return 'electron';
  }
  return 'http';
}
