/**
 * @module ModelsApi
 * HTTP клиент для работы с API каталога моделей Ollama.
 * Использует публичный эндпоинт для получения списка доступных моделей.
 */

import { fetchWithErrorHandling, withRetry } from '../utils/error-handler';
import type { OperationContext } from '../types/error-handler';
import type {
  ModelsApiConfig,
  ModelsApiResult,
  ModelsApiModel,
} from '../types/models';
import { DEFAULT_CONFIG } from '../constants/models';

/**
 * @class ModelsApi
 * Основной класс для взаимодействия с API каталога моделей Ollama.
 * Предоставляет методы для получения списка доступных моделей.
 */
export class ModelsApi {
  private config: ModelsApiConfig;

  /**
   * Создает экземпляр ModelsApi с настройками.
   *
   * @param config - Конфигурация API клиента.
   */
  constructor(config?: Partial<ModelsApiConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Получает список всех доступных моделей со всеми квантизациями.
   *
   * @param signal - AbortSignal для отмены операции.
   * @returns Promise со списком моделей.
   */
  async getAvailableModels(signal?: AbortSignal): Promise<ModelsApiResult> {
    const context: OperationContext = {
      module: 'ModelsApi',
      operation: 'getAvailableModels',
    };

    return withRetry(
      async () => {
        try {
          const response = await fetchWithErrorHandling(
            this.config.baseUrl,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'User-Agent': 'Underlator-Electron/1.0.0',
              },
              signal,
            },
            context
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const models = (await response.json()) as ModelsApiModel[];

          return {
            success: true,
            models,
          };
        } catch (error) {
          console.error('❌ Error getting models from API:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : '❌ Unknown error',
          };
        }
      },
      {
        maxAttempts: this.config.retryAttempts,
        baseDelay: this.config.retryDelay,
        backoffMultiplier: 2,
        maxDelay: 10000,
        retryableErrors: ['network', 'timeout', 'service_unavailable'],
      },
      context
    );
  }

  /**
   * Обновляет конфигурацию API клиента.
   *
   * @param newConfig - Новая конфигурация.
   */
  updateConfig(newConfig: Partial<ModelsApiConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Получает текущую конфигурацию API клиента.
   *
   * @returns Текущая конфигурация.
   */
  getConfig(): ModelsApiConfig {
    return { ...this.config };
  }
}

/**
 * Создает экземпляр ModelsApi с настройками по умолчанию.
 *
 * @param config - Опциональная конфигурация.
 * @returns Экземпляр ModelsApi.
 */
export function createModelsApi(config?: Partial<ModelsApiConfig>): ModelsApi {
  return new ModelsApi(config);
}
