/**
 * @module SplashHandlers
 * @description IPC обработчики для splash screen
 * Предоставляет функции для обработки IPC сообщений splash screen с валидацией и логированием
 */

import { SplashManager } from '../../services/splash-manager';
import type {
  SplashMessages,
  SplashIpcMessage,
  SplashOperationResult,
  SplashEventType,
} from '../../types/splash.types';

/**
 * @description Класс для обработки IPC сообщений splash screen
 * Предоставляет методы для валидации и форматирования IPC операций splash screen
 */
export class SplashIpcHandler {
  private splashManager: SplashManager;

  /**
   * @description Создает экземпляр SplashIpcHandler
   * @param splashManager - Экземпляр SplashManager
   */
  constructor(splashManager: SplashManager) {
    this.splashManager = splashManager;
  }

  /**
   * @description Создает успешный IPC ответ для splash screen
   * @param data - Данные ответа
   * @param id - ID сообщения
   * @returns Форматированный успешный ответ
   */
  static createSuccessResponse<T>(
    data: T,
    _id?: string
  ): SplashOperationResult<T> {
    return {
      success: true,
      data,
      status: 'ready',
    };
  }

  /**
   * @description Создает ответ с ошибкой для splash screen
   * @param error - Сообщение об ошибке
   * @param _id - ID сообщения
   * @returns Форматированный ответ с ошибкой
   */
  static createErrorResponse(
    error: string,
    _id?: string
  ): SplashOperationResult {
    return {
      success: false,
      error,
      status: 'error',
    };
  }

  /**
   * @description Создает IPC сообщение для splash screen
   * @param type - Тип события
   * @param data - Данные сообщения
   * @param id - ID сообщения
   * @returns Форматированное сообщение
   */
  static createSplashMessage(
    type: string,
    data?: unknown,
    id?: string
  ): SplashIpcMessage {
    return {
      type: type as SplashEventType, // Временное решение для совместимости типов
      data,
      timestamp: Date.now(),
      id,
    };
  }

  /**
   * @description Валидирует входящий IPC запрос splash screen
   * @param request - Объект запроса
   * @param requiredFields - Обязательные поля
   * @returns Результат валидации
   */
  static validateSplashRequest(
    request: unknown,
    requiredFields: string[] = []
  ): { valid: boolean; error?: string } {
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Invalid splash request format' };
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
   * @description Логирует IPC операцию splash screen
   * @param operation - Название операции
   * @param request - Входящий запрос
   * @param response - Исходящий ответ
   * @param duration - Время выполнения в миллисекундах
   */
  static logSplashOperation(
    operation: string,
    request?: unknown,
    response?: unknown,
    duration?: number
  ): void {
    const logData = {
      operation,
      timestamp: new Date().toISOString(),
      request: request ? JSON.stringify(request) : undefined,
      response: response ? JSON.stringify(response) : undefined,
      duration: duration ? `${duration}ms` : undefined,
    };

    console.log(`[Splash IPC] ${operation}:`, logData);
  }

  /**
   * @description Обрабатывает ошибки IPC операций splash screen
   * @param error - Объект ошибки
   * @param context - Контекст операции
   * @returns Форматированная ошибка для IPC
   */
  static handleSplashError(error: unknown, context?: string): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;

    console.error(`[Splash IPC Error] ${fullMessage}`, error);

    return fullMessage;
  }

  /**
   * @description Создает обертку для IPC обработчика splash screen с логированием
   * @param handler - Функция обработчика
   * @param operationName - Название операции для логирования
   * @returns Обернутый обработчик
   */
  static createSplashHandlerWrapper<T, R>(
    handler: (request: T) => Promise<R>,
    operationName: string
  ) {
    return async (
      _event: unknown,
      request: T
    ): Promise<SplashOperationResult<R>> => {
      const startTime = Date.now();
      const requestId = Math.random().toString(36).substr(2, 9);

      try {
        // Логирует входящий запрос
        this.logSplashOperation(operationName, request, undefined, undefined);

        // Выполняет обработчик
        const result = await handler(request);
        const duration = Date.now() - startTime;

        // Создает успешный ответ
        const response = this.createSuccessResponse(result, requestId);

        // Логирует успешный ответ
        this.logSplashOperation(operationName, request, response, duration);

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = this.handleSplashError(error, operationName);
        const response = this.createErrorResponse(errorMessage, requestId);

        // Логирует ошибку
        this.logSplashOperation(operationName, request, response, duration);

        return response;
      }
    };
  }

  /**
   * @description Обработчик для обновления статуса splash screen
   * @param request - Запрос с новым статусом
   * @returns Результат операции
   */
  async handleUpdateStatus(
    request: SplashMessages
  ): Promise<SplashOperationResult<void>> {
    try {
      // Валидация входящего запроса
      const validation = SplashIpcHandler.validateSplashRequest(request, [
        'status',
        'message',
      ]);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const result = await this.splashManager.updateStatus(request);
      return result;
    } catch (error) {
      console.error('Ошибка обновления статуса splash screen:', error);
      return SplashIpcHandler.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * @description Обработчик для установки прогресса splash screen
   * @param request - Запрос с прогрессом
   * @returns Результат операции
   */
  async handleSetProgress(request: {
    progress: number;
  }): Promise<SplashOperationResult<void>> {
    try {
      // Валидация входящего запроса
      const validation = SplashIpcHandler.validateSplashRequest(request, [
        'progress',
      ]);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const result = await this.splashManager.setProgress(request.progress);
      return result;
    } catch (error) {
      console.error('Ошибка установки прогресса splash screen:', error);
      return SplashIpcHandler.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * @description Обработчик для завершения инициализации splash screen
   * @param request - Запрос завершения
   * @returns Результат операции
   */
  async handleComplete(
    _request: unknown = {}
  ): Promise<SplashOperationResult<void>> {
    try {
      const result = await this.splashManager.complete();
      return result;
    } catch (error) {
      console.error('Ошибка завершения splash screen:', error);
      return SplashIpcHandler.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * @description Обработчик для обработки ошибки splash screen
   * @param request - Запрос с ошибкой
   * @returns Результат операции
   */
  async handleError(request: {
    error: string;
  }): Promise<SplashOperationResult<void>> {
    try {
      // Валидация входящего запроса
      const validation = SplashIpcHandler.validateSplashRequest(request, [
        'error',
      ]);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const result = await this.splashManager.handleError(request.error);
      return result;
    } catch (error) {
      console.error('Ошибка обработки ошибки splash screen:', error);
      return SplashIpcHandler.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * @description Обработчик для получения текущего статуса splash screen
   * @param request - Запрос статуса
   * @returns Текущий статус
   */
  async handleGetStatus(
    _request: unknown = {}
  ): Promise<SplashOperationResult<SplashMessages>> {
    try {
      const status = this.splashManager.getCurrentStatus();
      return SplashIpcHandler.createSuccessResponse(status);
    } catch (error) {
      console.error('Ошибка получения статуса splash screen:', error);
      return SplashIpcHandler.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * @description Обработчик для показа splash screen
   * @param request - Запрос показа
   * @returns Результат операции
   */
  async handleShow(
    _request: unknown = {}
  ): Promise<SplashOperationResult<void>> {
    try {
      const result = await this.splashManager.show();
      return result;
    } catch (error) {
      console.error('Ошибка показа splash screen:', error);
      return SplashIpcHandler.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * @description Обработчик для скрытия splash screen
   * @param request - Запрос скрытия
   * @returns Результат операции
   */
  async handleHide(
    _request: unknown = {}
  ): Promise<SplashOperationResult<void>> {
    try {
      const result = await this.splashManager.hide();
      return result;
    } catch (error) {
      console.error('Ошибка скрытия splash screen:', error);
      return SplashIpcHandler.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

/**
 * @description Создает экземпляр SplashIpcHandler
 * @param splashManager - Экземпляр SplashManager
 * @returns Экземпляр SplashIpcHandler
 */
export function createSplashIpcHandler(
  splashManager: SplashManager
): SplashIpcHandler {
  return new SplashIpcHandler(splashManager);
}
