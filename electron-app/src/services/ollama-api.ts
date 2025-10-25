/**
 * @module OllamaApi
 * HTTP клиент для работы с Ollama API.
 * Реализует все основные операции: генерация, управление моделями, streaming ответы.
 */

import {
  OLLAMA_DEFAULT_CONFIG,
  OLLAMA_ENDPOINTS,
  OLLAMA_HEADERS,
  OLLAMA_DEFAULT_OPTIONS,
} from '../constants/ollama';
import {
  fetchWithErrorHandling,
  withRetry,
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
  OllamaEmbeddingRequest,
  OllamaEmbeddingResponse,
} from '../types/ollama';
import type { ElectronApiConfig } from '../types/electron';

/**
 * @class OllamaApi
 * Основной класс для взаимодействия с Ollama HTTP API.
 * Предоставляет методы для генерации текста и управления моделями.
 */
export class OllamaApi {
  private config: OllamaApiConfig;
  private baseUrl: string;

  /**
   * Создает экземпляр OllamaApi с настройками.
   *
   * @param config - Конфигурация API клиента.
   */
  constructor(config?: Partial<OllamaApiConfig>) {
    this.config = {
      ...OLLAMA_DEFAULT_CONFIG,
      ...config,
    } as OllamaApiConfig;
    this.baseUrl = this.config.baseUrl;
  }

  /**
   * Генерирует текст с помощью указанной модели.
   * Поддерживает streaming ответы и обработку ошибок.
   *
   * @param request - Параметры генерации.
   * @param config - Конфигурация для API.
   * @param onChunk - Callback для обработки streaming ответов.
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise с полным ответом.
   */
  async generate(
    request: OllamaGenerateRequest,
    config: ElectronApiConfig,
    onChunk?: OllamaStreamCallback,
    signal?: AbortSignal
  ): Promise<string> {
    const context = `generate(${request.model})`;

    return withRetry(
      async () => {
        // Создает сигнал отмены
        const abortController = new AbortController();
        if (signal) {
          signal.addEventListener('abort', () => abortController.abort());
        }

        try {
          // Подготавливает запрос с параметрами по умолчанию
          const requestBody: OllamaGenerateRequest = {
            ...request,
            ...OLLAMA_DEFAULT_OPTIONS,
          };

          console.log('⚛️ requestBody', requestBody);
          console.log('⚛️ config', config);

          const response = await fetchWithErrorHandling(
            `${config.url || this.baseUrl}${OLLAMA_ENDPOINTS.GENERATE}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': OLLAMA_HEADERS.CONTENT_TYPE,
                Accept: OLLAMA_HEADERS.ACCEPT,
                'User-Agent': OLLAMA_HEADERS.USER_AGENT,
              },
              body: JSON.stringify(requestBody),
              signal: abortController.signal,
            },
            { module: 'OllamaApi', operation: 'listModels' }
          );

          // Обрабатывает streaming ответ
          return await processStreamResponse(
            response,
            (chunk: unknown) => {
              onChunk?.(chunk as OllamaGenerateResponse);
            },
            (error: string) => {
              console.error(`❌ Streaming error in ${context}:`, error);
            },
            { module: 'OllamaApi', operation: 'listModels' }
          );
        } catch (error) {
          // Обрабатывает ошибки отмены
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('❌ Operation was cancelled');
          }
          throw error;
        }
      },
      undefined,
      { module: 'OllamaApi', operation: 'listModels' }
    );
  }

  /**
   * Получает список доступных моделей.
   *
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise со списком моделей.
   */
  async listModels(signal?: AbortSignal): Promise<OllamaModelsResponse> {
    return withRetry(
      async () => {
        const response = await fetchWithErrorHandling(
          `${this.baseUrl}${OLLAMA_ENDPOINTS.LIST_MODELS}`,
          {
            method: 'GET',
            headers: {
              Accept: OLLAMA_HEADERS.ACCEPT,
              'User-Agent': OLLAMA_HEADERS.USER_AGENT,
            },
            signal,
          },
          { module: 'OllamaApi', operation: 'listModels' }
        );

        return (await response.json()) as OllamaModelsResponse;
      },
      undefined,
      { module: 'OllamaApi', operation: 'listModels' }
    );
  }

  /**
   * Устанавливает модель из реестра.
   * Поддерживает streaming прогресс установки.
   *
   * @param request - Параметры установки модели.
   * @param onProgress - Callback для обработки прогресса.
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise с результатом установки.
   */
  async installModel(
    request: OllamaPullRequest,
    onProgress?: OllamaProgressCallback,
    signal?: AbortSignal
  ): Promise<OllamaOperationResult<void>> {
    const context = `installModel(${request.name})`;

    return withRetry(
      async () => {
        const response = await fetchWithErrorHandling(
          `${this.baseUrl}${OLLAMA_ENDPOINTS.PULL_MODEL}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': OLLAMA_HEADERS.CONTENT_TYPE,
              Accept: OLLAMA_HEADERS.ACCEPT,
              'User-Agent': OLLAMA_HEADERS.USER_AGENT,
            },
            body: JSON.stringify(request),
            signal,
          },
          { module: 'OllamaApi', operation: 'installModel', details: context }
        );

        // Обрабатывает streaming прогресс установки
        await processStreamResponse(
          response,
          (chunk: unknown) => {
            onProgress?.({
              ...(chunk as OllamaPullProgress),
              name: request.name,
            });

            // Проверяет на ошибки установки
            if ((chunk as OllamaPullProgress).error) {
              throw new Error(
                `❌ Model installation failed: ${(chunk as OllamaPullProgress).error}`
              );
            }
          },
          (error: string) => {
            console.error(`❌ Installation error in ${context}:`, error);
          },
          { module: 'OllamaApi', operation: 'installModel', details: context }
        );

        return {
          success: true,
          status: 'success',
        };
      },
      undefined,
      { module: 'OllamaApi', operation: 'installModel', details: context }
    );
  }

  /**
   * Удаляет модель из системы.
   *
   * @param request - Параметры удаления модели.
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise с результатом удаления.
   */
  async removeModel(
    request: OllamaDeleteRequest,
    signal?: AbortSignal
  ): Promise<OllamaOperationResult<OllamaDeleteResponse>> {
    const context = `removeModel(${request.name})`;

    return withRetry(
      async () => {
        const response = await fetchWithErrorHandling(
          `${this.baseUrl}${OLLAMA_ENDPOINTS.DELETE_MODEL}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': OLLAMA_HEADERS.CONTENT_TYPE,
              Accept: OLLAMA_HEADERS.ACCEPT,
              'User-Agent': OLLAMA_HEADERS.USER_AGENT,
            },
            body: JSON.stringify(request),
            signal,
          },
          { module: 'OllamaApi', operation: 'removeModel', details: context }
        );

        // Ollama API для удаления модели возвращает пустой ответ при успехе
        // Проверяет статус ответа вместо парсинга JSON
        if (response.ok) {
          return {
            success: true,
            data: { success: true },
            status: 'success',
          };
        } else {
          // Если статус не 200, пытается получить JSON с ошибкой
          try {
            const errorResult = (await response.json()) as OllamaDeleteResponse;
            return {
              success: false,
              data: errorResult,
              status: 'error',
            };
          } catch {
            // Если не удается парсить JSON, возвращает ошибку по статусу
            return {
              success: false,
              data: { success: false },
              status: 'error',
            };
          }
        }
      },
      undefined,
      { module: 'OllamaApi', operation: 'removeModel', details: context }
    );
  }

  /**
   * Проверяет доступность Ollama сервера.
   *
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise с результатом проверки.
   */
  async healthCheck(signal?: AbortSignal): Promise<boolean> {
    try {
      const response = await fetchWithErrorHandling(
        `${this.baseUrl}${OLLAMA_ENDPOINTS.LIST_MODELS}`,
        {
          method: 'GET',
          headers: {
            Accept: OLLAMA_HEADERS.ACCEPT,
            'User-Agent': OLLAMA_HEADERS.USER_AGENT,
          },
          signal,
        },
        { module: 'OllamaApi', operation: 'healthCheck' }
      );

      return response.ok;
    } catch (error) {
      console.error(`❌ Health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Получает информацию о конкретной модели.
   *
   * @param modelName - Название модели.
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise с информацией о модели.
   */
  async getModelInfo(
    modelName: string,
    signal?: AbortSignal
  ): Promise<unknown> {
    const context = `getModelInfo(${modelName})`;

    return withRetry(
      async () => {
        const response = await fetchWithErrorHandling(
          `${this.baseUrl}${OLLAMA_ENDPOINTS.SHOW_MODEL}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': OLLAMA_HEADERS.CONTENT_TYPE,
              Accept: OLLAMA_HEADERS.ACCEPT,
              'User-Agent': OLLAMA_HEADERS.USER_AGENT,
            },
            body: JSON.stringify({ name: modelName }),
            signal,
          },
          { module: 'OllamaApi', operation: 'getModelInfo', details: context }
        );

        return await response.json();
      },
      undefined,
      { module: 'OllamaApi', operation: 'getModelInfo', details: context }
    );
  }

  /**
   * Генерирует эмбеддинг для указанного текста.
   * Использует модель эмбеддингов для создания векторного представления текста.
   *
   * @param request - Параметры генерации эмбеддинга.
   * @param config - Конфигурация для API.
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise с эмбеддингом.
   */
  async generateEmbedding(
    request: OllamaEmbeddingRequest,
    config: ElectronApiConfig,
    signal?: AbortSignal
  ): Promise<OllamaOperationResult<OllamaEmbeddingResponse>> {
    const context = `generateEmbedding(${request.model})`;

    try {
      // Валидирует параметры запроса
      const validationResult = this.validateEmbeddingRequest(request);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          status: 'error',
        };
      }

      const result = await withRetry(
        async () => {
          // Создает сигнал отмены
          const abortController = new AbortController();
          if (signal) {
            signal.addEventListener('abort', () => abortController.abort());
          }

          try {
            const response = await fetchWithErrorHandling(
              `${config.url || this.baseUrl}${OLLAMA_ENDPOINTS.EMBEDDINGS}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': OLLAMA_HEADERS.CONTENT_TYPE,
                  Accept: OLLAMA_HEADERS.ACCEPT,
                  'User-Agent': OLLAMA_HEADERS.USER_AGENT,
                },
                body: JSON.stringify(request),
                signal: abortController.signal,
              },
              {
                module: 'OllamaApi',
                operation: 'generateEmbedding',
                details: context,
              }
            );

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }

            const embeddingResponse: OllamaEmbeddingResponse =
              (await response.json()) as OllamaEmbeddingResponse;

            console.log(
              `✅ Embedding generated for the model: ${request.model}`
            );
            return embeddingResponse;
          } catch (error) {
            console.error(`❌ Error generating embedding:`, error);
            throw error;
          }
        },
        {
          maxAttempts: this.config.retryAttempts,
          baseDelay: this.config.retryDelay,
          backoffMultiplier: 2,
          maxDelay: 10000,
          retryableErrors: ['network', 'timeout', 'service_unavailable'],
        },
        {
          module: 'OllamaApi',
          operation: 'generateEmbedding',
          details: context,
        }
      );

      return {
        success: true,
        data: result,
        status: 'success',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Critical error generating embedding:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        status: 'error',
      };
    }
  }

  /**
   * Генерирует эмбеддинги для множественных текстов.
   * Оптимизирует производительность через батчевую обработку.
   *
   * @param requests - Массив параметров генерации эмбеддингов.
   * @param config - Конфигурация для API.
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise с массивом эмбеддингов.
   */
  async generateEmbeddings(
    requests: OllamaEmbeddingRequest[],
    config: ElectronApiConfig,
    signal?: AbortSignal
  ): Promise<OllamaOperationResult<OllamaEmbeddingResponse[]>> {
    try {
      // Валидирует все запросы
      for (const request of requests) {
        const validationResult = this.validateEmbeddingRequest(request);
        if (!validationResult.valid) {
          return {
            success: false,
            error: `Validation error: ${validationResult.error}`,
            status: 'error',
          };
        }
      }

      const results: OllamaEmbeddingResponse[] = [];

      // Обрабатывает запросы батчами для оптимизации производительности
      const batchSize = 5; // Оптимальный размер батча
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);

        // Обрабатывает батч параллельно
        const batchPromises = batch.map(request =>
          this.generateEmbedding(request, config, signal)
        );

        const batchResults = await Promise.all(batchPromises);

        // Проверяет результаты батча
        for (const result of batchResults) {
          if (!result.success) {
            return {
              success: false,
              error: `Batch error: ${result.error}`,
              status: 'error',
            };
          }
          if (result.data) {
            results.push(result.data);
          }
        }

        // Небольшая задержка между батчами для снижения нагрузки
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Generated ${results.length} embeddings`);

      return {
        success: true,
        data: results,
        status: 'success',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `❌ A critical error in batch embedding generation:`,
        errorMessage
      );

      return {
        success: false,
        error: errorMessage,
        status: 'error',
      };
    }
  }

  /**
   * Валидирует параметры запроса для генерации эмбеддинга.
   * Проверяет корректность входных данных перед отправкой запроса.
   *
   * @param request - Параметры запроса для валидации.
   * @returns Результат валидации.
   */
  private validateEmbeddingRequest(request: OllamaEmbeddingRequest): {
    valid: boolean;
    error?: string;
  } {
    // Проверяет наличие обязательных полей
    if (!request.model || typeof request.model !== 'string') {
      return {
        valid: false,
        error: 'Embedding model not specified or has an invalid format',
      };
    }

    if (!request.prompt || typeof request.prompt !== 'string') {
      return {
        valid: false,
        error: 'Text for vectorization not specified or has an invalid format',
      };
    }

    // Проверяет длину входного текста
    if (request.prompt.length === 0) {
      return {
        valid: false,
        error: 'Text for vectorization cannot be empty',
      };
    }

    // Проверяет максимальную длину текста (общий лимит для большинства моделей)
    const maxLength = 8192;
    if (request.prompt.length > maxLength) {
      return {
        valid: false,
        error: `Text is too long. Maximum length: ${maxLength} characters`,
      };
    }

    // Валидирует дополнительные опции
    if (request.options) {
      if (request.options.temperature !== undefined) {
        if (
          typeof request.options.temperature !== 'number' ||
          request.options.temperature < 0 ||
          request.options.temperature > 1
        ) {
          return {
            valid: false,
            error: 'Temperature must be a number between 0 and 1',
          };
        }
      }

      if (request.options.max_tokens !== undefined) {
        if (
          typeof request.options.max_tokens !== 'number' ||
          request.options.max_tokens <= 0
        ) {
          return {
            valid: false,
            error: 'Maximum number of tokens must be a positive number',
          };
        }
      }

      if (request.options.num_threads !== undefined) {
        if (
          typeof request.options.num_threads !== 'number' ||
          request.options.num_threads <= 0
        ) {
          return {
            valid: false,
            error: 'Number of threads must be a positive number',
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Обновляет конфигурацию API клиента.
   *
   * @param newConfig - Новая конфигурация.
   */
  updateConfig(newConfig: Partial<OllamaApiConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    this.baseUrl = this.config.baseUrl;
  }

  /**
   * Получает текущую конфигурацию API клиента.
   *
   * @returns Текущая конфигурация.
   */
  getConfig(): OllamaApiConfig {
    return { ...this.config };
  }

  /**
   * Создает новый экземпляр API с другой конфигурацией.
   *
   * @param config - Новая конфигурация.
   * @returns Новый экземпляр OllamaApi.
   */
  clone(config?: Partial<OllamaApiConfig>): OllamaApi {
    return new OllamaApi({
      ...this.config,
      ...config,
    });
  }
}

/**
 * Создает экземпляр OllamaApi с настройками по умолчанию.
 *
 * @param config - Опциональная конфигурация.
 * @returns Экземпляр OllamaApi.
 */
export function createOllamaApi(config?: Partial<OllamaApiConfig>): OllamaApi {
  return new OllamaApi(config);
}
