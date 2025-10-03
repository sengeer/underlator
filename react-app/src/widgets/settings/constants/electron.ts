/**
 * @module ElectronConstants
 * Конфигурация по умолчанию для API клиента Electron.
 * Настройки для оптимальной работы с Electron IPC.
 */

import type { SettingsApiConfig } from '../types/electron';

export const DEFAULT_CONFIG: SettingsApiConfig = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
};
