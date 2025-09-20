/**
 * @module SplashTypes
 * @description Типы для работы с splash screen в React архитектуре
 * Определяет интерфейсы для управления состоянием splash screen и передачи прогресса инициализации
 */

/**
 * @description Статусы инициализации Ollama
 * Отслеживает различные этапы инициализации для отображения в splash screen
 */
export type SplashStatus =
  | 'initializing'
  | 'checking-ollama'
  | 'starting-ollama'
  | 'waiting-for-server'
  | 'health-check'
  | 'creating-api'
  | 'creating-catalog'
  | 'ready'
  | 'error';

/**
 * @description Сообщения для отображения в splash screen
 * Текстовые описания для каждого статуса инициализации
 */
export interface SplashMessages {
  /** Статус инициализации */
  status: SplashStatus;
  /** Текст для отображения пользователю */
  message?: string;
  /** Дополнительная информация */
  details?: string;
  /** Прогресс в процентах (0-100) */
  progress?: number;
}

/**
 * @description Callback для обновления статуса
 * Используется для передачи обновлений статуса в React splash screen
 */
export type SplashStatusCallback = (status: SplashMessages) => void;

/**
 * @description Callback для обновления прогресса
 * Используется для передачи обновлений прогресса в React splash screen
 */
export type SplashProgressCallback = (progress: number) => void;

/**
 * @description Callback для завершения инициализации
 * Используется для уведомления о завершении инициализации в React splash screen
 */
export type SplashCompleteCallback = () => void;

/**
 * @description Callback для обработки ошибок
 * Используется для передачи ошибок в React splash screen
 */
export type SplashErrorCallback = (error: string) => void;
