/**
 * @module DetectTransport
 * Выбор транспорта: явный `VITE_BACKEND_MODE` побеждает runtime detect.
 */

import type { BackendMode } from './types';

/** Глобали для detect без обязательного DOM. */
export interface DetectTransportGlobals {
  electron?: unknown;
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
}

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
