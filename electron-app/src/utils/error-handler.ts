/**
 * @module ErrorHandler
 * Утилиты для обработки ошибок в Electron приложении.
 * Реализует retry логику и централизованную обработку ошибок для всех модулей.
 */

import {
  ERROR_TYPES,
  ERROR_MESSAGES,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_ERROR_HANDLER_CONFIG,
  RETRYABLE_ERROR_TYPES,
  HTTP_STATUS_TO_ERROR_TYPE,
  ERROR_NAME_TO_TYPE,
} from '../constants/error-handler';
import type {
  OperationResult,
  ClassifiedError,
  OperationContext,
  RetryConfig,
  ErrorHandlerConfig,
  ErrorHandlingOptions,
  OperationStatus,
} from '../types/error-handler';

/**
 * Класс для обработки ошибок в Electron приложении.
 * Предоставляет методы для классификации и обработки различных типов ошибок.
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = {
      ...DEFAULT_ERROR_HANDLER_CONFIG,
      ...config,
    };
  }

  /**
   * Классифицирует ошибку по типу.
   * Определяет категорию ошибки для правильной обработки.
   *
   * @param error - Объект ошибки.
   * @returns Классифицированная ошибка с типом и сообщением.
   */
  classifyError(error: unknown): ClassifiedError {
    const errorObj = error as any;

    // Ошибки сети
    if (errorObj.name === 'TypeError' && errorObj.message?.includes('fetch')) {
      return {
        type: 'network',
        message: ERROR_MESSAGES.network,
        originalError: error,
        retryable: true,
      };
    }

    // Ошибки таймаута
    if (
      errorObj.name === 'AbortError' ||
      errorObj.message?.includes('timeout')
    ) {
      return {
        type: 'timeout',
        message: ERROR_MESSAGES.timeout,
        originalError: error,
        retryable: true,
      };
    }

    // HTTP ошибки
    if (errorObj.status) {
      const errorType = HTTP_STATUS_TO_ERROR_TYPE[errorObj.status] || 'unknown';
      return {
        type: errorType,
        message: ERROR_MESSAGES[errorType],
        originalError: error,
        statusCode: errorObj.status,
        retryable: RETRYABLE_ERROR_TYPES.includes(errorType),
      };
    }

    // Ошибки по имени
    if (errorObj.name && ERROR_NAME_TO_TYPE[errorObj.name]) {
      const errorType = ERROR_NAME_TO_TYPE[errorObj.name];
      if (errorType) {
        return {
          type: errorType,
          message: ERROR_MESSAGES[errorType],
          originalError: error,
          retryable: RETRYABLE_ERROR_TYPES.includes(errorType),
        };
      }
    }

    // Неизвестные ошибки
    return {
      type: 'unknown',
      message: ERROR_MESSAGES.unknown,
      originalError: error,
      retryable: false,
    };
  }

  /**
   * Проверяет, нужно ли повторить операцию.
   * Определяет, является ли ошибка временной и подходящей для retry.
   *
   * @param error - Объект ошибки.
   * @returns true если операцию стоит повторить.
   */
  shouldRetry(error: unknown): boolean {
    const classified = this.classifyError(error);
    return classified.retryable;
  }

  /**
   * Создает результат операции с ошибкой.
   *
   * @param error - Объект ошибки.
   * @param context - Контекст операции.
   * @param status - Статус операции.
   * @returns Результат операции с ошибкой.
   */
  createErrorResult<T>(
    error: unknown,
    context?: OperationContext,
    status: OperationStatus = 'error'
  ): OperationResult<T> {
    const classified = this.classifyError(error);

    return {
      success: false,
      error: classified.message,
      errorType: classified.type,
      status,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Создает успешный результат операции.
   *
   * @param data - Данные результата.
   * @param context - Контекст операции.
   * @param status - Статус операции.
   * @returns Успешный результат операции.
   */
  createSuccessResult<T>(
    data: T,
    context?: OperationContext,
    status: OperationStatus = 'success'
  ): OperationResult<T> {
    return {
      success: true,
      data,
      status,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Логирует ошибку с контекстом.
   * Записывает информацию об ошибке для отладки.
   *
   * @param error - Объект ошибки.
   * @param context - Контекст операции.
   * @param attempt - Номер попытки (для retry).
   */
  logError(error: unknown, context?: OperationContext, attempt?: number): void {
    const classified = this.classifyError(error);

    const logMessage = [
      `${this.config.logPrefix} ${ERROR_TYPES[classified.type]}`,
      context?.module && `Module: ${context.module}`,
      context?.operation && `Operation: ${context.operation}`,
      attempt && `Attempt: ${attempt}`,
      `Message: ${classified.message}`,
      `Original: ${(error as any).message || error}`,
    ]
      .filter(Boolean)
      .join(' | ');

    console.error(`❌ ${logMessage}`);

    if (this.config.enableStackLogging && (error as any).stack) {
      console.error('Stack trace:', (error as any).stack);
    }
  }

  /**
   * Логирует успешную операцию.
   *
   * @param context - Контекст операции.
   * @param duration - Время выполнения в миллисекундах.
   */
  logSuccess(context?: OperationContext, duration?: number): void {
    if (!this.config.enableVerboseLogging) return;

    const logMessage = [
      `${this.config.logPrefix} SUCCESS`,
      context?.module && `Module: ${context.module}`,
      context?.operation && `Operation: ${context.operation}`,
      duration && `Duration: ${duration}ms`,
    ]
      .filter(Boolean)
      .join(' | ');

    console.log(`✅ ${logMessage}`);
  }

  /**
   * Обновляет конфигурацию обработчика ошибок.
   *
   * @param newConfig - Новая конфигурация.
   */
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Получает текущую конфигурацию.
   *
   * @returns Текущая конфигурация.
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }
}

/**
 * Глобальный экземпляр обработчика ошибок.
 */
export const errorHandler = new ErrorHandler();

/**
 * Утилита для выполнения операций с retry логикой.
 * Автоматически повторяет операции при временных ошибках.
 *
 * @param operation - Функция для выполнения.
 * @param config - Конфигурация retry.
 * @param context - Контекст операции.
 * @returns Promise с результатом операции.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: OperationContext
): Promise<T> {
  const retryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Логирует ошибку
      errorHandler.logError(error, context, attempt);

      // Проверяет, нужно ли повторить
      if (
        !errorHandler.shouldRetry(error) ||
        attempt === retryConfig.maxAttempts
      ) {
        break;
      }

      // Вычисляет задержку с экспоненциальным backoff
      const delay = Math.min(
        retryConfig.baseDelay *
          Math.pow(retryConfig.backoffMultiplier, attempt - 1),
        retryConfig.maxDelay
      );

      // Ждет перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Если все попытки исчерпаны, выбрасывает последнюю ошибку
  throw lastError;
}

/**
 * Утилита для создания HTTP запроса с обработкой ошибок.
 * Обертка над fetch с дополнительной обработкой ошибок.
 *
 * @param url - URL для запроса.
 * @param options - Опции fetch.
 * @param context - Контекст операции.
 * @returns Promise с ответом.
 */
export async function fetchWithErrorHandling(
  url: string,
  options: RequestInit = {},
  context?: OperationContext
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    // Проверяет статус ответа
    if (!response.ok) {
      const error = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );
      (error as any).status = response.status;
      throw error;
    }

    return response;
  } catch (error) {
    errorHandler.logError(error, context);
    throw error;
  }
}

/**
 * Утилита для обработки streaming ответов.
 * Обрабатывает поток данных с обработкой ошибок.
 *
 * @param response - HTTP ответ.
 * @param onChunk - Callback для обработки чанков.
 * @param onError - Callback для обработки ошибок.
 * @param context - Контекст операции.
 * @returns Promise с полным ответом.
 */
export async function processStreamResponse(
  response: Response,
  onChunk: (chunk: unknown) => void,
  onError?: (error: string) => void,
  context?: OperationContext
): Promise<string> {
  try {
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;

        // Пытается парсить JSON чанки
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              onChunk(data);
            } catch {
              // Игнорирует ошибки парсинга отдельных строк
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown streaming error';
    errorHandler.logError(error, context);

    if (onError) {
      onError(errorMessage);
    }

    throw error;
  }
}

/**
 * Утилита для выполнения операции с обработкой ошибок.
 * Обертка для автоматического создания результатов операций.
 *
 * @param operation - Функция для выполнения.
 * @param options - Опции обработки ошибок.
 * @returns Promise с результатом операции.
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlingOptions = {}
): Promise<OperationResult<T>> {
  const startTime = Date.now();
  const context = options.context;

  try {
    if (options.logOperation !== false) {
      errorHandler.logSuccess(context, 0);
    }

    const result = await operation();

    if (options.logSuccess !== false) {
      errorHandler.logSuccess(context, Date.now() - startTime);
    }

    return errorHandler.createSuccessResult(result, context);
  } catch (error) {
    errorHandler.logError(error, context);

    if (options.returnErrorAsResult) {
      return errorHandler.createErrorResult(error, context);
    }

    throw error;
  }
}

/**
 * Утилита для выполнения операции с retry и обработкой ошибок.
 * Комбинирует retry логику с обработкой ошибок.
 *
 * @param operation - Функция для выполнения.
 * @param options - Опции обработки ошибок.
 * @returns Promise с результатом операции.
 */
export async function executeWithRetryAndErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlingOptions = {}
): Promise<OperationResult<T>> {
  const context = options.context;

  try {
    const result = await withRetry(operation, options.retryConfig, context);

    return errorHandler.createSuccessResult(result, context);
  } catch (error) {
    errorHandler.logError(error, context);

    if (options.returnErrorAsResult) {
      return errorHandler.createErrorResult(error, context);
    }

    throw error;
  }
}

// Экспорт для обратной совместимости
export { ErrorHandler as OllamaErrorHandler };
