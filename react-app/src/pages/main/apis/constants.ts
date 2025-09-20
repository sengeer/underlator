import type { SplashApiConfig } from '../types';

/**
 * @description Конфигурация по умолчанию для API клиента
 * Базовые настройки для работы с splash screen API
 */
export const DEFAULT_CONFIG: SplashApiConfig = {
  enableLogging: false,
  timeout: 5000,
} as const;
