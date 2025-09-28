/**
 * @module SplashConstants
 * Константы для работы с splash screen.
 * Централизованная конфигурация для всех операций splash screen.
 */

/**
 * Временные интервалы для splash screen.
 * Настройки времени для различных операций.
 */
export const SPLASH_TIMING = {
  /** Задержка перед показом splash screen */
  SHOW_DELAY: 100,
  /** Задержка перед скрытием splash screen */
  HIDE_DELAY: 500,
  /** Интервал обновления анимации */
  ANIMATION_INTERVAL: 16, // ~60 FPS
  /** Длительность анимации перехода */
  TRANSITION_DURATION: 300,
  /** Задержка между обновлениями статуса */
  STATUS_UPDATE_DELAY: 200,
} as const;

/**
 * IPC события для splash screen в React архитектуре.
 * События для коммуникации между main и renderer процессами.
 */
export const SPLASH_IPC_EVENTS = {
  /** Получение текущего статуса */
  GET_STATUS: 'splash:get-status',
  /** Обновление статуса */
  STATUS_UPDATE: 'splash:status-update',
  /** Обновление прогресса */
  PROGRESS_UPDATE: 'splash:progress-update',
  /** Завершение инициализации */
  COMPLETE: 'splash:complete',
  /** Ошибка инициализации */
  ERROR: 'splash:error',
} as const;
