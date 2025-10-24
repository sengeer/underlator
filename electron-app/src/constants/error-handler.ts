/**
 * @module ErrorHandlerConstants
 * Константы для обработки ошибок в Electron приложении.
 */

import type {
  ErrorType,
  RetryConfig,
  ErrorHandlerConfig,
} from '../types/error-handler';

/**
 * Типы ошибок с соответствующими сообщениями.
 */
export const ERROR_TYPES: Record<ErrorType, string> = {
  network: 'NETWORK_ERROR',
  timeout: 'TIMEOUT_ERROR',
  validation: 'VALIDATION_ERROR',
  permission: 'PERMISSION_ERROR',
  not_found: 'NOT_FOUND_ERROR',
  conflict: 'CONFLICT_ERROR',
  rate_limit: 'RATE_LIMIT_ERROR',
  service_unavailable: 'SERVICE_UNAVAILABLE_ERROR',
  bad_request: 'BAD_REQUEST_ERROR',
  unauthorized: 'UNAUTHORIZED_ERROR',
  forbidden: 'FORBIDDEN_ERROR',
  internal: 'INTERNAL_ERROR',
  unknown: 'UNKNOWN_ERROR',
};

/**
 * Сообщения об ошибках по типам.
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  network: '❌ Network error: unable to connect to server',
  timeout: '❌ Operation timeout exceeded',
  validation: '❌ Input data validation error',
  permission: '❌ Insufficient permissions to perform operation',
  not_found: '❌ Requested resource not found',
  conflict: '❌ Data conflict: resource already exists',
  rate_limit: '❌ Request rate limit exceeded',
  service_unavailable: '❌ Service temporarily unavailable',
  bad_request: '❌ Invalid request',
  unauthorized: '❌ Authentication required',
  forbidden: '❌ Access denied',
  internal: '❌ Internal server error',
  unknown: '❌ Unknown error',
};

/**
 * HTTP статус коды для классификации ошибок.
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Конфигурация retry по умолчанию.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  retryableErrors: ['network', 'timeout', 'service_unavailable', 'rate_limit'],
};

/**
 * Конфигурация обработки ошибок по умолчанию.
 */
export const DEFAULT_ERROR_HANDLER_CONFIG: ErrorHandlerConfig = {
  enableVerboseLogging: true,
  enableStackLogging: false,
  logPrefix: '[ErrorHandler]',
  defaultRetryConfig: DEFAULT_RETRY_CONFIG,
};

/**
 * Типы ошибок, которые можно повторить.
 */
export const RETRYABLE_ERROR_TYPES: ErrorType[] = [
  'network',
  'timeout',
  'service_unavailable',
  'rate_limit',
];

/**
 * Типы ошибок, которые не стоит повторять.
 */
export const NON_RETRYABLE_ERROR_TYPES: ErrorType[] = [
  'validation',
  'permission',
  'not_found',
  'conflict',
  'bad_request',
  'unauthorized',
  'forbidden',
  'internal',
  'unknown',
];

/**
 * Маппинг HTTP статус кодов на типы ошибок.
 */
export const HTTP_STATUS_TO_ERROR_TYPE: Record<number, ErrorType> = {
  [HTTP_STATUS.BAD_REQUEST]: 'bad_request',
  [HTTP_STATUS.UNAUTHORIZED]: 'unauthorized',
  [HTTP_STATUS.FORBIDDEN]: 'forbidden',
  [HTTP_STATUS.NOT_FOUND]: 'not_found',
  [HTTP_STATUS.CONFLICT]: 'conflict',
  [HTTP_STATUS.RATE_LIMIT]: 'rate_limit',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'internal',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'service_unavailable',
};

/**
 * Маппинг названий ошибок на типы ошибок.
 */
export const ERROR_NAME_TO_TYPE: Record<string, ErrorType> = {
  TypeError: 'network',
  AbortError: 'timeout',
  ValidationError: 'validation',
  PermissionError: 'permission',
  NotFoundError: 'not_found',
  ConflictError: 'conflict',
  RateLimitError: 'rate_limit',
  ServiceUnavailableError: 'service_unavailable',
  BadRequestError: 'bad_request',
  UnauthorizedError: 'unauthorized',
  ForbiddenError: 'forbidden',
  InternalError: 'internal',
};
