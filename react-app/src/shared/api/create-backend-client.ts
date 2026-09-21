/**
 * @module CreateBackendClient
 * Фабрика и ленивый singleton над выбранным транспортом.
 */

import type { BackendClient } from './backend-client';
import { detectTransport } from './detect-transport';
import { ElectronTransport } from './transports/electron-transport';
import { HttpTransport } from './transports/http-transport';
import { TauriTransport } from './transports/tauri-transport';

let singleton: BackendClient | null = null;

/**
 * Создаёт клиент для текущего режима (без кэша).
 */
export function createBackendClient(): BackendClient {
  const mode = detectTransport();
  switch (mode) {
    case 'electron':
      return new ElectronTransport();
    case 'tauri':
      return new TauriTransport();
    default:
      return new HttpTransport();
  }
}

/**
 * Ленивый singleton BackendClient.
 */
export function getBackendClient(): BackendClient {
  if (!singleton) {
    singleton = createBackendClient();
  }
  return singleton;
}

/**
 * Сбрасывает singleton. Только для unit-тестов.
 */
export function resetBackendClientForTests(): void {
  singleton = null;
}
