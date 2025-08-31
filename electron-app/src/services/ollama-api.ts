/**
 * @module OllamaApi
 * @description HTTP клиент для работы с Ollama API
 * Реализует все основные операции: генерация, управление моделями, streaming ответы
 */

import {
  OLLAMA_DEFAULT_CONFIG,
  OLLAMA_ENDPOINTS,
  OLLAMA_HEADERS,
  OLLAMA_DEFAULT_GENERATION_PARAMS,
} from '../constants/ollama.constants';
import {
  fetchWithErrorHandling,
  withRetry,
  createTimeoutController,
  processStreamResponse,
} from '../utils/error-handler';
import type {
  OllamaApiConfig,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaModelsResponse,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaDeleteRequest,
  OllamaDeleteResponse,
  OllamaStreamCallback,
  OllamaProgressCallback,
  OllamaOperationResult,
} from '../types/ollama.types';

/**
 * @class OllamaApi
 * @description Основной класс для взаимодействия с Ollama HTTP API
 * Предоставляет методы для генерации текста и управления моделями
 */
export class OllamaApi {
  private config: OllamaApiConfig;
  private baseUrl: string;

  /**
   * @description Создает экземпляр OllamaApi с настройками
   * @param config - Конфигурация API клиента
   */
  constructor(config?: Partial<OllamaApiConfig>) {
    this.config = {
      ...OLLAMA_DEFAULT_CONFIG,
      ...config,
    } as OllamaApiConfig;
    this.baseUrl = this.config.baseUrl;
  }

  /**
   * @description Генерирует текст с помощью указанной модели
   * Поддерживает streaming ответы и обработку ошибок
   * @param request - Параметры генерации
   * @param onChunk - Callback для обработки streaming ответов
   * @param signal - AbortSignal для отмены операции
   * @returns Promise с полным ответом
   */
  async generate(
    request: OllamaGenerateRequest,
    onChunk?: OllamaStreamCallback,
    signal?: AbortSignal
  ): Promise<string> {
    const context = `generate(${request.model})`;

    return withRetry(async () => {
      // Создаем таймаут контроллер
      const { controller: timeoutController } = createTimeoutController(
        this.config.timeout
      );

      // Объединяем сигналы отмены
      const abortController = new AbortController();
      if (signal) {
        signal.addEventListener('abort', () => abortController.abort());
      }
      timeoutController.signal.addEventListener('abort', () => abortController.abort());

      try {
        // Подготавливаем запрос с параметрами по умолчанию
        const requestBody: OllamaGenerateRequest = {
          ...OLLAMA_DEFAULT_GENERATION_PARAMS,
          ...request,
        };

        const response = await fetchWithErrorHandling(
          `${this.baseUrl}${OLLAMA_ENDPOINTS.GENERATE}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': OLLAMA_HEADERS.CONTENT_TYPE,
              'Accept': OLLAMA_HEADERS.ACCEPT,
              'User-Agent': OLLAMA_HEADERS.USER_AGENT,
            },
            body: JSON.stringify(requestBody),
            signal: abortController.signal,
          },
          context
        );

        // Обрабатываем streaming ответ
        return await processStreamResponse(
          response,
          (chunk: OllamaGenerateResponse) => {
            onChunk?.(chunk);
          },
          (error: string) => {
            console.error(`Streaming error in ${context}:`, error);
          }
        );
      } catch (error) {
        // Обрабатываем ошибки отмены
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Operation was cancelled');
        }
        throw error;
      }
    }, undefined, context);
  }

  /**
   * @description Получает список доступных моделей
   * @param signal - AbortSignal для отмены операции
   * @returns Promise со списком моделей
   */
  async listModels(signal?: AbortSignal): Promise<OllamaModelsResponse> {
    const context = 'listModels';

    return withRetry(async () => {
      const response = await fetchWithErrorHandling(
        `${this.baseUrl}${OLLAMA_ENDPOINTS.LIST_MODELS}`,
        {
          method: 'GET',
          headers: {
            'Accept': OLLAMA_HEADERS.ACCEPT,
            'User-Agent': OLLAMA_HEADERS.USER_AGENT,
          },
          signal,
        },
        context
      );

      return await response.json() as OllamaModelsResponse;
    }, undefined, context);
  }

  /**
   * @description Устанавливает модель из реестра
   * Поддерживает streaming прогресс установки
   * @param request - Параметры установки модели
   * @param onProgress - Callback для обработки прогресса
   * @param signal - AbortSignal для отмены операции
   * @returns Promise с результатом установки
   */
  async installModel(
    request: OllamaPullRequest,
    onProgress?: OllamaProgressCallback,
    signal?: AbortSignal
  ): Promise<OllamaOperationResult<void>> {
    const context = `installModel(${request.name})`;

    return withRetry(async () => {
      const response = await fetchWithErrorHandling(
        `${this.baseUrl}${OLLAMA_ENDPOINTS.PULL_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': OLLAMA_HEADERS.CONTENT_TYPE,
            'Accept': OLLAMA_HEADERS.ACCEPT,
            'User-Agent': OLLAMA_HEADERS.USER_AGENT,
          },
          body: JSON.stringify(request),
          signal,
        },
        context
      );

      // Обрабатываем streaming прогресс установки
      await processStreamResponse(
        response,
        (chunk: OllamaPullProgress) => {
          onProgress?.(chunk);

          // Проверяем на ошибки установки
          if (chunk.error) {
            throw new Error(`Model installation failed: ${chunk.error}`);
          }
        },
        (error: string) => {
          console.error(`Installation error in ${context}:`, error);
        }
      );

      return {
        success: true,
        status: 'success',
      };
    }, undefined, context);
  }

  /**
   * @description Удаляет модель из системы
   * @param request - Параметры удаления модели
   * @param signal - AbortSignal для отмены операции
   * @returns Promise с результатом удаления
   */
  async removeModel(
    request: OllamaDeleteRequest,
    signal?: AbortSignal
  ): Promise<OllamaOperationResult<OllamaDeleteResponse>> {
    const context = `removeModel(${request.name})`;

    return withRetry(async () => {
      const response = await fetchWithErrorHandling(
        `${this.baseUrl}${OLLAMA_ENDPOINTS.DELETE_MODEL}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': OLLAMA_HEADERS.CONTENT_TYPE,
            'Accept': OLLAMA_HEADERS.ACCEPT,
            'User-Agent': OLLAMA_HEADERS.USER_AGENT,
          },
          body: JSON.stringify(request),
          signal,
        },
        context
      );

      const result = await response.json() as OllamaDeleteResponse;

      return {
        success: result.success,
        data: result,
        status: result.success ? 'success' : 'error',
      };
    }, undefined, context);
  }

  /**
   * @description Проверяет доступность Ollama сервера
   * @param signal - AbortSignal для отмены операции
   * @returns Promise с результатом проверки
   */
  async healthCheck(signal?: AbortSignal): Promise<boolean> {
    const context = 'healthCheck';

    try {
      const response = await fetchWithErrorHandling(
        `${this.baseUrl}${OLLAMA_ENDPOINTS.HEALTH}`,
        {
          method: 'GET',
          headers: {
            'Accept': OLLAMA_HEADERS.ACCEPT,
            'User-Agent': OLLAMA_HEADERS.USER_AGENT,
          },
          signal,
        },
        context
      );

      return response.ok;
    } catch (error) {
      console.warn(`Health check failed: ${error}`);
      return false;
    }
  }

  /**
   * @description Получает информацию о конкретной модели
   * @param modelName - Название модели
   * @param signal - AbortSignal для отмены операции
   * @returns Promise с информацией о модели
   */
  async getModelInfo(modelName: string, signal?: AbortSignal): Promise<any> {
    const context = `getModelInfo(${modelName})`;

    return withRetry(async () => {
      const response = await fetchWithErrorHandling(
        `${this.baseUrl}${OLLAMA_ENDPOINTS.SHOW_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': OLLAMA_HEADERS.CONTENT_TYPE,
            'Accept': OLLAMA_HEADERS.ACCEPT,
            'User-Agent': OLLAMA_HEADERS.USER_AGENT,
          },
          body: JSON.stringify({ name: modelName }),
          signal,
        },
        context
      );

      return await response.json();
    }, undefined, context);
  }

  /**
   * @description Обновляет конфигурацию API клиента
   * @param newConfig - Новая конфигурация
   */
  updateConfig(newConfig: Partial<OllamaApiConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    this.baseUrl = this.config.baseUrl;
  }

  /**
   * @description Получает текущую конфигурацию API клиента
   * @returns Текущая конфигурация
   */
  getConfig(): OllamaApiConfig {
    return { ...this.config };
  }

  /**
   * @description Создает новый экземпляр API с другой конфигурацией
   * @param config - Новая конфигурация
   * @returns Новый экземпляр OllamaApi
   */
  clone(config?: Partial<OllamaApiConfig>): OllamaApi {
    return new OllamaApi({
      ...this.config,
      ...config,
    });
  }
}

/**
 * @description Создает экземпляр OllamaApi с настройками по умолчанию
 * @param config - Опциональная конфигурация
 * @returns Экземпляр OllamaApi
 */
export function createOllamaApi(config?: Partial<OllamaApiConfig>): OllamaApi {
  return new OllamaApi(config);
}

/**
 * @description Экспорт типов для использования в других модулях
 */
export type {
  OllamaApiConfig,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaModelsResponse,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaDeleteRequest,
  OllamaDeleteResponse,
  OllamaStreamCallback,
  OllamaProgressCallback,
  OllamaOperationResult,
};
