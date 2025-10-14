/**
 * @module SplashTypes
 * Типы для работы с splash screen в React архитектуре.
 * Определяет интерфейсы для управления состоянием splash screen и передачи прогресса инициализации.
 */

/**
 * Статусы инициализации Ollama.
 * Отслеживает различные этапы инициализации для отображения в splash screen.
 */
export type SplashStatus =
  | 'initializing'
  | 'checking-ollama'
  | 'starting-ollama'
  | 'waiting-for-server'
  | 'health-check'
  | 'creating-api'
  | 'creating-catalog'
  | 'creating-filesystem'
  | 'getting-catalog'
  | 'ready'
  | 'error';

/**
 * Сообщения для отображения в splash screen.
 * Текстовые описания для каждого статуса инициализации.
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
