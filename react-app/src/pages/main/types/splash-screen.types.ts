/**
 * @module SplashScreenTypes
 * @description Типы для splash screen в React приложении
 * Определяет все интерфейсы и типы для работы с splash screen
 */

/**
 * @description Статус инициализации приложения
 * Определяет возможные состояния процесса инициализации
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
 * @description Интерфейс для статуса splash screen
 * Определяет структуру данных статуса инициализации
 * @property {SplashStatus} status - Статус инициализации
 * @property {string} message - Текст для отображения пользователю
 * @property {string} details - Дополнительная информация
 * @property {number} progress - Прогресс в процентах (0-100)
 */
export interface SplashStatusData {
  status: SplashStatus;
  message?: string;
  details?: string;
  progress?: number;
}

/**
 * @description Интерфейс для конфигурации API клиента
 * Настройки для управления поведением API клиента
 * @property {boolean} enableLogging - Включить логирование операций
 * @property {number} timeout - Таймаут для операций в миллисекундах
 */
export interface SplashApiConfig {
  enableLogging: boolean;
  timeout: number;
}

/**
 * @description Интерфейс для состояния splash screen в Redux
 * Определяет структуру состояния splash screen в Redux store
 * @property {SplashStatusData | null} status - Статус инициализации
 * @property {number} progress - Прогресс инициализации в процентах (0-100)
 * @property {boolean} loading - Состояние загрузки
 * @property {string | null} error - Ошибка инициализации
 * @property {boolean} visible - Видимость splash screen
 * @property {number | null} startTime - Время начала инициализации
 * @property {number | null} endTime - Время завершения инициализации
 */
export interface SplashScreenState {
  status: SplashStatusData | null;
  progress: number;
  loading: boolean;
  error: string | null;
  visible: boolean;
  startTime: number | null;
  endTime: number | null;
}

/**
 * @description Интерфейс для пропсов компонента SplashScreen
 * Определяет свойства компонента splash screen
 * @property {string} className - Дополнительные CSS классы
 */
export interface SplashScreenProps {
  className?: string;
}

/**
 * @description Тип для callback функций статуса
 * Определяет сигнатуру функций обратного вызова для обновлений статуса
 */
export type SplashStatusCallback = (status: SplashStatusData) => void;

/**
 * @description Тип для callback функций прогресса
 * Определяет сигнатуру функций обратного вызова для обновлений прогресса
 */
export type SplashProgressCallback = (progress: number) => void;

/**
 * @description Тип для callback функций завершения
 * Определяет сигнатуру функций обратного вызова для завершения инициализации
 */
export type SplashCompleteCallback = () => void;

/**
 * @description Тип для callback функций ошибок
 * Определяет сигнатуру функций обратного вызова для ошибок
 */
export type SplashErrorCallback = (error: string) => void;
