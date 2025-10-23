/**
 * @module ErrorHandlerTypes
 * Типы для обработки ошибок в Electron приложении.
 * Поддерживает различные типы операций и контексты ошибок.
 */

/**
 * Статус операции для отслеживания состояния.
 */
export type OperationStatus =
  | 'idle'
  | 'loading'
  | 'connecting'
  | 'processing'
  | 'generating'
  | 'installing'
  | 'removing'
  | 'listing'
  | 'creating'
  | 'updating'
  | 'deleting'
  | 'reading'
  | 'writing'
  | 'validating'
  | 'success'
  | 'error';

/**
 * Типы ошибок для классификации.
 */
export type ErrorType =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'permission'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'service_unavailable'
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'internal'
  | 'unknown';

/**
 * Контекст операции для логирования.
 */
export interface OperationContext {
  /** Название модуля */
  module?: string;
  /** Название операции */
  operation?: string;
  /** Дополнительные детали */
  details?: string;
  /** Параметры операции */
  params?: Record<string, unknown>;
}

/**
 * Конфигурация для retry операций.
 */
export interface RetryConfig {
  /** Максимальное количество попыток */
  maxAttempts: number;
  /** Базовая задержка в миллисекундах */
  baseDelay: number;
  /** Множитель для экспоненциального backoff */
  backoffMultiplier: number;
  /** Максимальная задержка в миллисекундах */
  maxDelay: number;
  /** Типы ошибок, для которых стоит повторить операцию */
  retryableErrors: ErrorType[];
}

/**
 * Результат операции с возможностью ошибки.
 */
export interface OperationResult<T = unknown> {
  /** Успешность операции */
  success: boolean;
  /** Результат операции */
  data?: T;
  /** Ошибка при выполнении */
  error?: string;
  /** Статус операции */
  status: OperationStatus;
  /** Тип ошибки */
  errorType?: ErrorType;
  /** Контекст операции */
  context?: OperationContext;
  /** Временная метка операции */
  timestamp?: string;
}

/**
 * Классифицированная ошибка.
 */
export interface ClassifiedError {
  /** Тип ошибки */
  type: ErrorType;
  /** Сообщение об ошибке */
  message: string;
  /** Оригинальная ошибка */
  originalError: any;
  /** HTTP статус код (если применимо) */
  statusCode?: number;
  /** Можно ли повторить операцию */
  retryable: boolean;
}

/**
 * Конфигурация обработки ошибок.
 */
export interface ErrorHandlerConfig {
  /** Включить детальное логирование */
  enableVerboseLogging: boolean;
  /** Включить логирование стека ошибок */
  enableStackLogging: boolean;
  /** Префикс для логов */
  logPrefix: string;
  /** Конфигурация retry по умолчанию */
  defaultRetryConfig: RetryConfig;
}

/**
 * Опции для операций с обработкой ошибок.
 */
export interface ErrorHandlingOptions {
  /** Контекст операции */
  context?: OperationContext;
  /** Конфигурация retry */
  retryConfig?: Partial<RetryConfig>;
  /** Логировать операцию */
  logOperation?: boolean;
  /** Логировать успешные операции */
  logSuccess?: boolean;
  /** Преобразовать ошибку в результат */
  returnErrorAsResult?: boolean;
}
