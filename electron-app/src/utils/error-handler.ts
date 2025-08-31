/**
 * @module OllamaErrorHandler
 * @description Утилиты для обработки ошибок Ollama API
 * Реализует retry логику и централизованную обработку ошибок
 */

import {
  OLLAMA_ERROR_TYPES,
  OLLAMA_ERROR_MESSAGES,
  OLLAMA_RETRY_CONFIG,
  OLLAMA_HTTP_STATUS,
} from '../constants/ollama.constants';
import type { OllamaOperationResult } from '../types/ollama.types';

/**
 * @description Класс для обработки ошибок Ollama API
 * Предоставляет методы для классификации и обработки различных типов ошибок
 */
export class OllamaErrorHandler {
  /**
   * @description Классифицирует ошибку по типу
   * Определяет категорию ошибки для правильной обработки
   * @param error - Объект ошибки
   * @returns Классифицированная ошибка с типом и сообщением
   */
  static classifyError(error: any): {
    type: string;
    message: string;
    originalError: any;
  } {
    // Ошибки сети
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        type: OLLAMA_ERROR_TYPES.NETWORK_ERROR,
        message: OLLAMA_ERROR_MESSAGES.NETWORK_ERROR,
        originalError: error,
      };
    }

    // Ошибки таймаута
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return {
        type: OLLAMA_ERROR_TYPES.TIMEOUT_ERROR,
        message: OLLAMA_ERROR_MESSAGES.TIMEOUT_ERROR,
        originalError: error,
      };
    }

    // HTTP ошибки
    if (error.status) {
      switch (error.status) {
        case OLLAMA_HTTP_STATUS.NOT_FOUND:
          return {
            type: OLLAMA_ERROR_TYPES.MODEL_ERROR,
            message: OLLAMA_ERROR_MESSAGES.MODEL_NOT_FOUND,
            originalError: error,
          };
        case OLLAMA_HTTP_STATUS.SERVICE_UNAVAILABLE:
          return {
            type: OLLAMA_ERROR_TYPES.NETWORK_ERROR,
            message: OLLAMA_ERROR_MESSAGES.SERVER_UNAVAILABLE,
            originalError: error,
          };
        case OLLAMA_HTTP_STATUS.BAD_REQUEST:
          return {
            type: OLLAMA_ERROR_TYPES.VALIDATION_ERROR,
            message: OLLAMA_ERROR_MESSAGES.INVALID_PARAMS,
            originalError: error,
          };
        default:
          return {
            type: OLLAMA_ERROR_TYPES.API_ERROR,
            message: error.message || OLLAMA_ERROR_MESSAGES.UNKNOWN_ERROR,
            originalError: error,
          };
      }
    }

    // Неизвестные ошибки
    return {
      type: OLLAMA_ERROR_TYPES.UNKNOWN_ERROR,
      message: OLLAMA_ERROR_MESSAGES.UNKNOWN_ERROR,
      originalError: error,
    };
  }

  /**
   * @description Проверяет, нужно ли повторить операцию
   * Определяет, является ли ошибка временной и подходящей для retry
   * @param error - Объект ошибки
   * @returns true если операцию стоит повторить
   */
  static shouldRetry(error: any): boolean {
    const { type } = this.classifyError(error);

    // Повторяем только сетевые ошибки и временные ошибки сервера
    return [
      OLLAMA_ERROR_TYPES.NETWORK_ERROR,
      OLLAMA_ERROR_TYPES.TIMEOUT_ERROR,
    ].includes(type as any);
  }

  /**
   * @description Создает результат операции с ошибкой
   * Форматирует ошибку в стандартный формат результата
   * @param error - Объект ошибки
   * @returns Результат операции с информацией об ошибке
   */
  static createErrorResult<T>(error: any): OllamaOperationResult<T> {
    const { message } = this.classifyError(error);

    return {
      success: false,
      error: message,
      status: 'error',
    };
  }

  /**
   * @description Логирует ошибку с контекстом
   * Записывает информацию об ошибке для отладки
   * @param error - Объект ошибки
   * @param context - Контекст операции
   * @param attempt - Номер попытки (для retry)
   */
  static logError(error: any, context?: string, attempt?: number): void {
    const { type, message } = this.classifyError(error);

    const logMessage = [
      `[Ollama Error] ${type}`,
      context && `Context: ${context}`,
      attempt && `Attempt: ${attempt}`,
      `Message: ${message}`,
      `Original: ${error.message || error}`,
    ]
      .filter(Boolean)
      .join(' | ');

    console.error(logMessage);
  }
}

/**
 * @description Утилита для выполнения операций с retry логикой
 * Автоматически повторяет операции при временных ошибках
 * @param operation - Функция для выполнения
 * @param config - Конфигурация retry
 * @param context - Контекст операции
 * @returns Promise с результатом операции
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config = OLLAMA_RETRY_CONFIG,
  context?: string
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= config.MAX_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Логируем ошибку
      OllamaErrorHandler.logError(error, context, attempt);

      // Проверяем, нужно ли повторить
      if (
        !OllamaErrorHandler.shouldRetry(error) ||
        attempt === config.MAX_ATTEMPTS
      ) {
        break;
      }

      // Вычисляем задержку с экспоненциальным backoff
      const delay = Math.min(
        config.BASE_DELAY * Math.pow(config.BACKOFF_MULTIPLIER, attempt - 1),
        config.MAX_DELAY
      );

      // Ждем перед следующей попыткой
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Если все попытки исчерпаны, выбрасываем последнюю ошибку
  throw lastError;
}

/**
 * @description Утилита для создания HTTP запроса с обработкой ошибок
 * Обертка над fetch с дополнительной обработкой ошибок
 * @param url - URL для запроса
 * @param options - Опции fetch
 * @param context - Контекст операции
 * @returns Promise с ответом
 */
export async function fetchWithErrorHandling(
  url: string,
  options: RequestInit = {},
  context?: string
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    // Проверяем статус ответа
    if (!response.ok) {
      const error = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );
      (error as any).status = response.status;
      throw error;
    }

    return response;
  } catch (error) {
    // Классифицируем и логируем ошибку
    OllamaErrorHandler.logError(error, context);
    throw error;
  }
}

/**
 * @description Утилита для создания AbortController с таймаутом
 * Автоматически отменяет операцию по истечении времени
 * @param timeout - Таймаут в миллисекундах
 * @returns Объект с controller и promise для таймаута
 */
export function createTimeoutController(timeout: number): {
  controller: AbortController;
  timeoutPromise: Promise<never>;
} {
  const controller = new AbortController();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      controller.abort();
      reject(new Error('Operation timeout'));
    }, timeout);
  });

  return { controller, timeoutPromise };
}

/**
 * @description Утилита для обработки streaming ответов
 * Обрабатывает поток данных с обработкой ошибок
 * @param response - HTTP ответ
 * @param onChunk - Callback для обработки чанков
 * @param onError - Callback для обработки ошибок
 * @returns Promise с полным ответом
 */
export async function processStreamResponse(
  response: Response,
  onChunk: (chunk: any) => void,
  onError?: (error: string) => void
): Promise<string> {
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
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          onChunk(data);

          if (data.response) {
            fullResponse += data.response;
          }
        } catch (parseError) {
          // Игнорируем ошибки парсинга отдельных строк
          console.warn('Failed to parse streaming chunk:', line);
        }
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown streaming error';
    onError?.(errorMessage);
    throw error;
  } finally {
    reader.releaseLock();
  }

  return fullResponse;
}
