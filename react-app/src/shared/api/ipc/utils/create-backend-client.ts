/**
 * @module CreateBackendClient
 * Фабрика и ленивый singleton над выбранным транспортом.
 */

import { ElectronTransport } from '../transports/electron-transport';
import { HttpTransport } from '../transports/http-transport';
import { TauriTransport } from '../transports/tauri-transport';
import type { BackendClient } from '../types/backend-client';
import { detectTransport } from './detect-transport';

let singleton: BackendClient | null = null;

/**
 * Создаёт клиент для текущего режима (без кэша).
 *
 * @returns Новый экземпляр BackendClient под выбранный транспорт.
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
 *
 * @returns Общий экземпляр BackendClient для процесса UI.
 */
export function getBackendClient(): BackendClient {
  if (!singleton) {
    singleton = createBackendClient();
  }
  return singleton;
}

/**
 * Сбрасывает singleton. Только для unit-тестов.
 *
 * @returns Ничего.
 */
export function resetBackendClientForTests(): void {
  singleton = null;
}
