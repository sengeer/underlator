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
  ElectronApiConfig,
} from '../types';

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
            context
          );

          // Обрабатывает streaming ответ
          return await processStreamResponse(
            response,
            (chunk: OllamaGenerateResponse) => {
              onChunk?.(chunk);
            },
            (error: string) => {
              console.error(`❌ Streaming error in ${context}:`, error);
            }
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
      context
    );
  }

  /**
   * Получает список доступных моделей.
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise со списком моделей.
   */
  async listModels(signal?: AbortSignal): Promise<OllamaModelsResponse> {
    const context = 'listModels';

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
          context
        );

        return (await response.json()) as OllamaModelsResponse;
      },
      undefined,
      context
    );
  }

  /**
   * Устанавливает модель из реестра.
   * Поддерживает streaming прогресс установки.
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
          context
        );

        // Обрабатывает streaming прогресс установки
        await processStreamResponse(
          response,
          (chunk: OllamaPullProgress) => {
            onProgress?.({ ...chunk, name: request.name });

            // Проверяет на ошибки установки
            if (chunk.error) {
              throw new Error(`❌ Model installation failed: ${chunk.error}`);
            }
          },
          (error: string) => {
            console.error(`❌ Installation error in ${context}:`, error);
          }
        );

        return {
          success: true,
          status: 'success',
        };
      },
      undefined,
      context
    );
  }

  /**
   * Удаляет модель из системы.
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
          context
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
      context
    );
  }

  /**
   * Проверяет доступность Ollama сервера.
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise с результатом проверки.
   */
  async healthCheck(signal?: AbortSignal): Promise<boolean> {
    const context = 'healthCheck';

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
        context
      );

      return response.ok;
    } catch (error) {
      console.error(`❌ Health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Получает информацию о конкретной модели.
   * @param modelName - Название модели.
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise с информацией о модели.
   */
  async getModelInfo(modelName: string, signal?: AbortSignal): Promise<any> {
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
          context
        );

        return await response.json();
      },
      undefined,
      context
    );
  }

  /**
   * Обновляет конфигурацию API клиента.
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
   * @returns Текущая конфигурация.
   */
  getConfig(): OllamaApiConfig {
    return { ...this.config };
  }

  /**
   * Создает новый экземпляр API с другой конфигурацией.
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
 * @param config - Опциональная конфигурация.
 * @returns Экземпляр OllamaApi.
 */
export function createOllamaApi(config?: Partial<OllamaApiConfig>): OllamaApi {
  return new OllamaApi(config);
}
