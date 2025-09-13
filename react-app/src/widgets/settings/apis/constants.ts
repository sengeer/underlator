import type { SettingsApiConfig } from '../types';

/**
 * @description Конфигурация по умолчанию для API клиента
 * Настройки для оптимальной работы с Electron IPC
 */
export const DEFAULT_CONFIG: SettingsApiConfig = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
};
