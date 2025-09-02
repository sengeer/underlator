/**
 * @module IpcHandlers
 * @description Утилиты для обработки IPC сообщений
 * Предоставляет функции для валидации, логирования и форматирования IPC операций
 */

import type { OllamaOperationResult } from '../types/ollama.types';

/**
 * @description Интерфейс для IPC сообщений
 * Стандартная структура для всех IPC операций
 */
export interface IpcMessage<T = any> {
  /** Тип операции */
  type: string;
  /** Данные сообщения */
  data?: T;
  /** Ошибка операции */
  error?: string;
  /** Статус операции */
  status: 'success' | 'error' | 'progress';
  /** ID сообщения для отслеживания */
  id?: string;
}

/**
 * @description Интерфейс для IPC запросов
 * Структура входящих запросов от renderer процесса
 */
export interface IpcRequest<T = any> {
  /** Тип операции */
  type: string;
  /** Параметры запроса */
  params?: T;
  /** ID запроса для отслеживания */
  id?: string;
}

/**
 * @description Интерфейс для IPC ответов
 * Структура ответов от main процесса
 */
export interface IpcResponse<T = any> {
  /** Успешность операции */
  success: boolean;
  /** Данные ответа */
  data?: T;
  /** Ошибка операции */
  error?: string;
  /** ID ответа для отслеживания */
  id?: string;
}

/**
 * @description Класс для обработки IPC сообщений
 * Предоставляет методы для валидации и форматирования IPC операций
 */
export class IpcHandler {
  /**
   * @description Создает успешный IPC ответ
   * @param data - Данные ответа
   * @param id - ID сообщения
   * @returns Форматированный успешный ответ
   */
  static createSuccessResponse<T>(data: T, id?: string): IpcResponse<T> {
    return {
      success: true,
      data,
      id,
    };
  }

  /**
   * @description Создает ответ с ошибкой
   * @param error - Сообщение об ошибке
   * @param id - ID сообщения
   * @returns Форматированный ответ с ошибкой
   */
  static createErrorResponse(error: string, id?: string): IpcResponse {
    return {
      success: false,
      error,
      id,
    };
  }

  /**
   * @description Создает прогресс сообщение
   * @param progress - Данные прогресса
   * @param id - ID сообщения
   * @returns Форматированное сообщение прогресса
   */
  static createProgressMessage<T>(progress: T, id?: string): IpcMessage<T> {
    return {
      type: 'progress',
      data: progress,
      status: 'progress',
      id,
    };
  }

  /**
   * @description Валидирует входящий IPC запрос
   * @param request - Объект запроса
   * @param requiredFields - Обязательные поля
   * @returns Результат валидации
   */
  static validateRequest(
    request: any,
    requiredFields: string[] = []
  ): { valid: boolean; error?: string } {
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Invalid request format' };
    }

    // Проверка обязательных полей
    for (const field of requiredFields) {
      if (!(field in request)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    return { valid: true };
  }

  /**
   * @description Логирует IPC операцию
   * @param operation - Название операции
   * @param request - Входящий запрос
   * @param response - Исходящий ответ
   * @param duration - Время выполнения в миллисекундах
   */
  static logOperation(
    operation: string,
    request?: any,
    response?: any,
    duration?: number
  ): void {
    const logData = {
      operation,
      timestamp: new Date().toISOString(),
      request: request ? JSON.stringify(request) : undefined,
      response: response ? JSON.stringify(response) : undefined,
      duration: duration ? `${duration}ms` : undefined,
    };

    console.log(`[IPC] ${operation}:`, logData);
  }

  /**
   * @description Обрабатывает ошибки IPC операций
   * @param error - Объект ошибки
   * @param context - Контекст операции
   * @returns Форматированная ошибка для IPC
   */
  static handleError(error: any, context?: string): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;

    console.error(`[IPC Error] ${fullMessage}`, error);

    return fullMessage;
  }

  /**
   * @description Преобразует результат Ollama операции в IPC ответ
   * @param result - Результат Ollama операции
   * @param id - ID сообщения
   * @returns IPC ответ
   */
  static convertOllamaResult<T>(
    result: OllamaOperationResult<T>,
    id?: string
  ): IpcResponse<T | undefined> {
    if (result.success) {
      return this.createSuccessResponse(result.data, id);
    } else {
      return this.createErrorResponse(result.error || 'Unknown error', id);
    }
  }

  /**
   * @description Создает обертку для IPC обработчика с логированием
   * @param handler - Функция обработчика
   * @param operationName - Название операции для логирования
   * @returns Обернутый обработчик
   */
  static createHandlerWrapper<T, R>(
    handler: (request: T) => Promise<R>,
    operationName: string
  ) {
    return async (_event: any, request: T): Promise<IpcResponse<R>> => {
      const startTime = Date.now();
      const requestId = Math.random().toString(36).substr(2, 9);

      try {
        // Логируем входящий запрос
        this.logOperation(operationName, request, undefined, undefined);

        // Выполняем обработчик
        const result = await handler(request);
        const duration = Date.now() - startTime;

        // Создаем успешный ответ
        const response = this.createSuccessResponse(result, requestId);

        // Логируем успешный ответ
        this.logOperation(operationName, request, response, duration);

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = this.handleError(error, operationName);
        const response = this.createErrorResponse(errorMessage, requestId);

        // Логируем ошибку
        this.logOperation(operationName, request, response, duration);

        return response;
      }
    };
  }

  /**
   * @description Создает обработчик для streaming операций
   * @param handler - Функция обработчика с callback
   * @param operationName - Название операции
   * @returns Обернутый streaming обработчик
   */
  static createStreamingHandlerWrapper<T>(
    handler: (request: T, onProgress: (progress: any) => void) => Promise<any>,
    operationName: string
  ) {
    return async (event: any, request: T): Promise<IpcResponse> => {
      const startTime = Date.now();
      const requestId = Math.random().toString(36).substr(2, 9);

      try {
        // Логируем входящий запрос
        this.logOperation(operationName, request, undefined, undefined);

        // Создаем callback для прогресса
        const onProgress = (progress: any) => {
          const progressMessage = this.createProgressMessage(
            progress,
            requestId
          );
          event.sender.send(`${operationName}:progress`, progressMessage);
        };

        // Выполняем обработчик
        const result = await handler(request, onProgress);
        const duration = Date.now() - startTime;

        // Создаем успешный ответ
        const response = this.createSuccessResponse(result, requestId);

        // Логируем успешный ответ
        this.logOperation(operationName, request, response, duration);

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = this.handleError(error, operationName);
        const response = this.createErrorResponse(errorMessage, requestId);

        // Логируем ошибку
        this.logOperation(operationName, request, response, duration);

        return response;
      }
    };
  }
}

/**
 * @description Утилита для создания уникального ID сообщения
 * @returns Уникальный ID
 */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * @description Утилита для проверки типа IPC сообщения
 * @param message - Объект сообщения
 * @param expectedType - Ожидаемый тип
 * @returns true если тип соответствует ожидаемому
 */
export function isMessageType(message: any, expectedType: string): boolean {
  return message && message.type === expectedType;
}

/**
 * @description Утилита для извлечения параметров из IPC запроса
 * @param request - Объект запроса
 * @returns Параметры запроса или пустой объект
 */
export function extractRequestParams(request: any): any {
  return request?.params || {};
}

/**
 * @description Утилита для создания стандартного IPC обработчика
 * @param operation - Название операции
 * @param handler - Функция обработчика
 * @returns Готовый IPC обработчик
 */
export function createStandardIpcHandler<T, R>(
  operation: string,
  handler: (params: T) => Promise<R>
) {
  return IpcHandler.createHandlerWrapper(handler, operation);
}

/**
 * @description Утилита для создания streaming IPC обработчика
 * @param operation - Название операции
 * @param handler - Функция обработчика с callback
 * @returns Готовый streaming IPC обработчик
 */
export function createStreamingIpcHandler<T>(
  operation: string,
  handler: (params: T, onProgress: (progress: any) => void) => Promise<any>
) {
  return IpcHandler.createStreamingHandlerWrapper(handler, operation);
}
