/**
 * @module SplashScreenTypes
 * Типы для splash screen.
 */

export type SplashStatus =
  | 'initializing'
  | 'checking-ollama'
  | 'starting-ollama'
  | 'waiting-for-server'
  | 'health-check'
  | 'creating-api'
  | 'downloading-ollama'
  | 'creating-catalog'
  | 'ready'
  | 'error';

/**
 * Интерфейс для статуса splash screen.
 * Определяет структуру данных статуса инициализации.
 */
export interface SplashStatusData {
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
 * Интерфейс для конфигурации API клиента.
 * Настройки для управления поведением API клиента.
 */
export interface SplashApiConfig {
  /** Включить логирование операций */
  enableLogging: boolean;
  /** Таймаут для операций в миллисекундах */
  timeout: number;
}

/**
 * Интерфейс для состояния splash screen в Redux.
 * Определяет структуру состояния splash screen в Redux store.
 */
export interface SplashScreenState {
  /** Статус инициализации */
  status: SplashStatusData | null;
  /** Прогресс инициализации в процентах (0-100) */
  progress: number;
  /** Состояние загрузки */
  loading: boolean;
  /** Ошибка инициализации */
  error: string | null;
  /** Видимость splash screen */
  visible: boolean;
  /** Время начала инициализации */
  startTime: number | null;
  /** Время завершения инициализации */
  endTime: number | null;
}

/**
 * Интерфейс для пропсов компонента SplashScreen.
 * Определяет свойства компонента splash screen.
 */
export interface SplashScreenProps {
  /** Дополнительные CSS классы */
  className?: string;
}

/**
 * Тип для callback функций статуса.
 * Определяет сигнатуру функций обратного вызова для обновлений статуса.
 */
export type SplashStatusCallback = (status: SplashStatusData) => void;

/**
 * Тип для callback функций прогресса.
 * Определяет сигнатуру функций обратного вызова для обновлений прогресса.
 */
export type SplashProgressCallback = (progress: number) => void;

/**
 * Тип для callback функций завершения.
 * Определяет сигнатуру функций обратного вызова для завершения инициализации.
 */
export type SplashCompleteCallback = () => void;

/**
 * Тип для callback функций ошибок.
 * Определяет сигнатуру функций обратного вызова для ошибок.
 */
export type SplashErrorCallback = (error: string) => void;
