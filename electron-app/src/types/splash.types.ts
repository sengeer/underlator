/**
 * @module SplashTypes
 * @description Типы для работы с splash screen
 * Определяет интерфейсы для управления состоянием splash screen и передачи прогресса инициализации
 */

/**
 * @description Статусы инициализации Ollama
 * Отслеживает различные этапы инициализации для отображения в splash screen
 */
export type SplashStatus =
  | 'initializing'
  | 'checking_ollama'
  | 'starting_ollama'
  | 'waiting_for_server'
  | 'health_check'
  | 'creating_api'
  | 'creating_catalog'
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
  message: string;
  /** Дополнительная информация */
  details?: string;
  /** Прогресс в процентах (0-100) */
  progress?: number;
}

/**
 * @description Конфигурация splash screen
 * Настройки для управления поведением splash screen
 */
export interface SplashConfig {
  /** Минимальное время отображения splash screen в миллисекундах */
  minDisplayTime: number;
  /** Автоматически скрывать splash screen при готовности */
  autoHide: boolean;
  /** Показывать детальную информацию */
  showDetails: boolean;
}

/**
 * @description События splash screen
 * Типы событий для IPC коммуникации между main и renderer процессами
 */
export type SplashEventType =
  | 'splash:update-status'
  | 'splash:set-progress'
  | 'splash:complete'
  | 'splash:error'
  | 'splash:hide';

/**
 * @description IPC сообщение для splash screen
 * Структура сообщений между main и renderer процессами
 */
export interface SplashIpcMessage {
  /** Тип события */
  type: SplashEventType;
  /** Данные сообщения */
  data?: unknown;
  /** Временная метка */
  timestamp: number;
  /** ID сообщения */
  id?: string;
}

/**
 * @description Результат операции splash screen
 * Универсальный тип для результатов операций splash screen
 */
export interface SplashOperationResult<T = any> {
  /** Успешность операции */
  success: boolean;
  /** Результат операции */
  data?: T;
  /** Ошибка при выполнении */
  error?: string;
  /** Статус операции */
  status: SplashStatus;
}

/**
 * @description Callback для обновления статуса
 * Используется для передачи обновлений статуса в splash screen
 */
export type SplashStatusCallback = (status: SplashMessages) => void;

/**
 * @description Callback для обновления прогресса
 * Используется для передачи обновлений прогресса в splash screen
 */
export type SplashProgressCallback = (progress: number) => void;

/**
 * @description Callback для завершения инициализации
 * Используется для уведомления о завершении инициализации
 */
export type SplashCompleteCallback = () => void;

/**
 * @description Callback для обработки ошибок
 * Используется для передачи ошибок в splash screen
 */
export type SplashErrorCallback = (error: string) => void;
