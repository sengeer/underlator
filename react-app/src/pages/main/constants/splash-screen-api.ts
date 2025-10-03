/**
 * @module SplashScreenApiConstants
 * Константы для работы с API splash screen.
 */

import type { SplashApiConfig } from '../types/splash-screen.types';

/**
 * Конфигурация по умолчанию для API клиента.
 */
export const DEFAULT_CONFIG: SplashApiConfig = {
  /** Включить логирование операций */
  enableLogging: false,
  /** Таймаут для операций в миллисекундах */
  timeout: 5000,
} as const;
