import type { SplashApiConfig } from '../types/splash-screen.types';

/**
 * @description Конфигурация по умолчанию для API клиента
 * @property {boolean} enableLogging - Включить логирование операций
 * @property {number} timeout - Таймаут для операций в миллисекундах
 */
export const DEFAULT_CONFIG: SplashApiConfig = {
  enableLogging: false,
  timeout: 5000,
} as const;
