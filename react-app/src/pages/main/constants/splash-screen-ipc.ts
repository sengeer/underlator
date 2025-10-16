/**
 * @module SplashScreenIpcConstants
 * Константы для работы с Splash Screen IPC.
 */

import type { SplashApiConfig } from '../types/splash-screen.types';

/**
 * Конфигурация по умолчанию для Splash Screen IPC API клиента.
 */
export const DEFAULT_CONFIG: SplashApiConfig = {
  /** Включить логирование операций */
  enableLogging: false,
  /** Таймаут для операций в миллисекундах */
  timeout: 5000,
} as const;
