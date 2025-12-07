/**
 * @module ModelCatalog
 * Сервис для получения каталога моделей Ollama.
 * Реализует кэширование, фильтрацию и поиск по моделям.
 */

import { OllamaApi } from './ollama-api';
import { ModelsApi, createModelsApi } from './models-api';
import { STATIC_MODELS, DEFAULT_CATALOG_CONFIG } from '../constants/catalog';
import { executeWithErrorHandling } from '../utils/error-handler';
import { getSystemInfo } from '../utils/system-info';
import {
  checkModelCompatibility,
  extractParameterSize,
  extractQuantizationLevel,
} from '../utils/model-compatibility';
import type { ModelCatalogConfig, CachedCatalog } from '../types/catalog';
import type {
  ModelCatalog,
  ModelFilters,
  OllamaModelInfo,
} from '../types/models';
import type { OllamaOperationResult } from '../types/ollama';
import type { OperationContext } from '../types/error-handler';

/**
 * @class ModelCatalogService
 *
 * Сервис для работы с каталогом моделей Ollama.
 * Предоставляет методы для получения, кэширования и фильтрации моделей.
 */
export class ModelCatalogService {
  private config: ModelCatalogConfig;
  private cache: CachedCatalog | null = null;
  private ollamaApi: OllamaApi;
  private modelsApi: ModelsApi;

  /**
   * Создает экземпляр ModelCatalogService.
   *
   * @param config - Конфигурация сервиса.
   * @param ollamaApi - Существующий экземпляр OllamaApi (опционально).
   */
  constructor(config?: Partial<ModelCatalogConfig>, ollamaApi?: OllamaApi) {
    this.config = {
      ...DEFAULT_CATALOG_CONFIG,
      ...config,
    };
    // Используется переданный OllamaApi, инициализируется новый при отсутствии
    this.ollamaApi =
      ollamaApi || new OllamaApi({ baseUrl: this.config.ollamaUrl });
    this.modelsApi = createModelsApi();
  }

  /**
   * Получает полный каталог доступных моделей.
   * Объединяет локально установленные модели с моделями из Ollama Library.
   * При отсутствии интернета возвращает только локальные модели.
   *
   * @param forceRefresh - Принудительное обновление кэша.
   * @returns Promise с каталогом моделей.
   */
  async getAvailableModels(
    forceRefresh = false
  ): Promise<OllamaOperationResult<ModelCatalog>> {
    const context: OperationContext = {
      module: 'ModelCatalogService',
      operation: 'getAvailableModels',
      details: `forceRefresh: ${forceRefresh}`,
    };

    return executeWithErrorHandling(
      async () => {
        if (!forceRefresh && this.isCacheValid() && this.cache) {
          return this.cache.catalog;
        }

        // Получает локально установленные модели
        const localModels = await this.getLocalModels();

        // Получает модели из Ollama Library через HTML парсинг
        const libraryModels = await this.getLibraryModels();

        // Создает каталог, объединяя локальные и библиотечные модели
        const catalog = this.createCombinedCatalog(localModels, libraryModels);

        // Сохраняет в кэш
        this.updateCache(catalog);

        return catalog;
      },
      {
        context,
        returnErrorAsResult: true,
      }
    ) as Promise<OllamaOperationResult<ModelCatalog>>;
  }

  /**
   * Получает информацию о конкретной модели.
   *
   * @param modelName - Название модели.
   * @returns Promise с информацией о модели.
   */
  async getModelInfo(
    modelName: string
  ): Promise<OllamaOperationResult<OllamaModelInfo | null>> {
    try {
      // Сначала получает каталог
      const catalogResult = await this.getAvailableModels();
      if (!catalogResult.success || !catalogResult.data) {
        return {
          success: false,
          error: 'Failed to get catalog',
          status: 'error',
        };
      }

      // Ищет модель в каталоге
      const model = catalogResult.data.ollama.find(
        m => m.name === modelName || m.name.includes(modelName)
      );

      if (!model) {
        return {
          success: true,
          data: null,
          status: 'success',
        };
      }

      return {
        success: true,
        data: model,
        status: 'success',
      };
    } catch (error) {
      console.error(
        `Error getting information about the model: ${modelName}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * Выполняет поиск моделей по фильтрам.
   *
   * @param filters - Фильтры для поиска.
   * @returns Promise с отфильтрованным каталогом.
   */
  async searchModels(
    filters: ModelFilters
  ): Promise<OllamaOperationResult<ModelCatalog>> {
    try {
      // Получает полный каталог
      const catalogResult = await this.getAvailableModels();
      if (!catalogResult.success || !catalogResult.data) {
        return {
          success: false,
          error: 'Failed to get catalog',
          status: 'error',
        };
      }

      const catalog = catalogResult.data;
      let filteredModels = [...catalog.ollama];

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredModels = filteredModels.filter(model => {
          // Приоритет поиска: название > отображаемое название > теги > описание
          const nameMatch = model.name.toLowerCase().includes(searchTerm);
          const displayNameMatch = model.displayName
            .toLowerCase()
            .includes(searchTerm);
          const tagsMatch =
            model.tags &&
            model.tags.some(tag => tag.toLowerCase().includes(searchTerm));

          // Для описания делает более строгий поиск - только если поисковый термин достаточно длинный
          const descriptionMatch =
            searchTerm.length >= 3 &&
            model.description &&
            model.description.toLowerCase().includes(searchTerm) &&
            !model.description.toLowerCase().includes('из ollama'); // Исключает стандартные описания

          const isMatch =
            nameMatch || displayNameMatch || tagsMatch || descriptionMatch;

          return isMatch;
        });
      }

      if (filters.minSize !== undefined) {
        const minSize = filters.minSize;
        filteredModels = filteredModels.filter(model => model.size >= minSize);
      }

      if (filters.maxSize !== undefined) {
        const maxSize = filters.maxSize;
        filteredModels = filteredModels.filter(model => model.size <= maxSize);
      }

      if (filters.tags && filters.tags.length > 0) {
        const tags = filters.tags;
        filteredModels = filteredModels.filter(
          model => model.tags && model.tags.some(tag => tags.includes(tag))
        );
      }

      // Создает отфильтрованный каталог
      const filteredCatalog: ModelCatalog = {
        ollama: filteredModels,
        totalCount: filteredModels.length,
        lastUpdated: catalog.lastUpdated,
      };

      return {
        success: true,
        data: filteredCatalog,
        status: 'success',
      };
    } catch (error) {
      console.error('Model search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * Очищает кэш каталога.
   * Принудительно сбрасывает кэшированные данные.
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Получает статистику кэша.
   *
   * @returns Информация о состоянии кэша.
   */
  getCacheStats(): {
    isCached: boolean;
    timestamp?: number;
    expiresAt?: number;
    isValid: boolean;
  } {
    return {
      isCached: this.cache !== null,
      timestamp: this.cache?.timestamp,
      expiresAt: this.cache?.expiresAt,
      isValid: this.isCacheValid(),
    };
  }

  /**
   * Обновляет конфигурацию сервиса.
   *
   * @param newConfig - Новая конфигурация.
   */
  updateConfig(newConfig: Partial<ModelCatalogConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Получает локально установленные модели из Ollama API.
   * При недоступности Ollama сервера возвращает пустой список.
   *
   * @returns Promise со списком локальных моделей.
   */
  private async getLocalModels(): Promise<OllamaModelInfo[]> {
    try {
      const response = await this.ollamaApi.listModels();
      return response.models.map((model, index) => ({
        id: `local-${model.name}-${index}`,
        name: model.name,
        displayName: model.name,
        description: `Локально установленная модель ${model.name}`,
        version: 'latest',
        size: model.size,
        createdAt: model.modified_at,
        modifiedAt: model.modified_at,
        type: 'ollama' as const,
        format: model.details?.format || 'gguf',
        parameterSize: model.details?.parameter_size || 'Unknown',
        quantizationLevel: model.details?.quantization_level || 'Unknown',
        tags: ['local', 'installed'],
      }));
    } catch (error) {
      // При недоступности Ollama сервера возвращает пустой список
      // Это позволяет приложению запускаться даже без локальных моделей
      console.warn(
        '⚠️ Ollama server unavailable, no local models available:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return [];
    }
  }

  /**
   * Получает модели из Ollama Library через API каталога моделей.
   * Использует публичный эндпоинт для получения списка доступных моделей.
   * При отсутствии интернета возвращает пустой список для graceful fallback.
   * Проверяет совместимость каждой модели с системой пользователя.
   *
   * @returns Promise со списком библиотечных моделей.
   */
  private async getLibraryModels(): Promise<OllamaModelInfo[]> {
    try {
      const apiResult = await this.modelsApi.getAvailableModels();

      if (!apiResult.success || !apiResult.models) {
        console.warn(
          "⚠️ Couldn't get models from the Ollama Library API, using a static list"
        );
        return await this.getStaticModels();
      }

      // Получает информацию о системе один раз для всех моделей
      const systemInfo = await getSystemInfo();

      // Преобразует модели из API в формат OllamaModelInfo
      // Создает отдельную запись для каждой комбинации модели и тега (квантизации)
      const libraryModels: OllamaModelInfo[] = [];

      for (const apiModel of apiResult.models) {
        // Если у модели есть теги, создается отдельная запись для каждого тега
        if (apiModel.tags && apiModel.tags.length > 0) {
          for (const tag of apiModel.tags) {
            // Формируется полное название модели с тегом
            const fullName = tag.includes(':')
              ? tag
              : `${apiModel.name}:${tag}`;

            // Извлекается базовое название модели
            const baseName = apiModel.name;

            // Извлекаются параметры модели (сначала из тега, потом из названия)
            const parameterSize =
              extractParameterSize(tag) ||
              extractParameterSize(baseName) ||
              'Unknown';
            const quantizationLevel = extractQuantizationLevel(tag);

            // Проверяется совместимость модели с системой
            const compatibility = checkModelCompatibility(
              baseName,
              tag,
              systemInfo
            );

            libraryModels.push({
              id: `library-${fullName}-${libraryModels.length}`,
              name: fullName,
              displayName: fullName,
              description:
                apiModel.description || `Модель ${fullName} из Ollama`,
              version: tag,
              size: 0, // Размер будет вычисляться на основе параметров
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
              type: 'ollama' as const,
              format: 'gguf',
              parameterSize,
              quantizationLevel,
              tags: [...apiModel.tags, 'library'],
              compatibilityStatus: compatibility.status,
              compatibilityMessages: compatibility.message,
            });
          }
        } else {
          // Если тегов нет, создается одна запись с базовым названием
          const parameterSize =
            extractParameterSize(apiModel.name) || 'Unknown';
          const quantizationLevel = extractQuantizationLevel('latest');

          // Проверяется совместимость модели с системой
          const compatibility = checkModelCompatibility(
            apiModel.name,
            'latest',
            systemInfo
          );

          libraryModels.push({
            id: `library-${apiModel.name}-${libraryModels.length}`,
            name: apiModel.name,
            displayName: apiModel.name,
            description:
              apiModel.description || `Модель ${apiModel.name} из Ollama`,
            version: 'latest',
            size: 0, // Размер будет вычисляться на основе параметров
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            type: 'ollama' as const,
            format: 'gguf',
            parameterSize,
            quantizationLevel,
            tags: ['library'],
            compatibilityStatus: compatibility.status,
            compatibilityMessages: compatibility.message,
          });
        }
      }

      return libraryModels;
    } catch (error) {
      // При сетевых ошибках возвращается пустой список для graceful fallback
      // Это позволяет приложению запускаться только с локальными моделями
      console.warn(
        '⚠️ Network error getting models from Ollama Library API, using only local models:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return [];
    }
  }

  /**
   * Получает статический список моделей как fallback.
   * Проверяет совместимость каждой модели с системой пользователя.
   *
   * @returns Список статических моделей.
   */
  private async getStaticModels(): Promise<OllamaModelInfo[]> {
    // Получает информацию о системе один раз для всех моделей
    const systemInfo = await getSystemInfo();

    return Promise.all(
      STATIC_MODELS.map(async (model, index) => {
        const parameterSize = extractParameterSize(model.name) || 'Unknown';
        const quantizationLevel = extractQuantizationLevel(model.name);

        // Проверяется совместимость модели с системой
        const compatibility = checkModelCompatibility(
          model.name,
          model.name,
          systemInfo
        );

        return {
          id: `static-${model.name}-${index}`,
          name: model.name,
          displayName: model.displayName,
          description: model.description,
          version: 'latest',
          size: model.size,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          type: 'ollama' as const,
          format: 'gguf',
          parameterSize,
          quantizationLevel,
          tags: model.tags,
          compatibilityStatus: compatibility.status,
          compatibilityMessages: compatibility.message,
        };
      })
    );
  }

  /**
   * Создает объединенный каталог из локальных и библиотечных моделей.
   *
   * @param localModels - Локально установленные модели.
   * @param libraryModels - Модели из Ollama Library.
   * @returns Объединенный каталог моделей.
   */
  private createCombinedCatalog(
    localModels: OllamaModelInfo[],
    libraryModels: OllamaModelInfo[]
  ): ModelCatalog {
    // Объединяем локальные и библиотечные модели, убирая дубликаты.
    const localModelNames = new Set(localModels.map(m => m.name));
    const availableLibraryModels = libraryModels.filter(
      m => !localModelNames.has(m.name)
    );

    const allModels = [...localModels, ...availableLibraryModels];

    return {
      ollama: allModels,
      totalCount: allModels.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Проверяет валидность кэша.
   *
   * @returns true если кэш действителен.
   */
  private isCacheValid(): boolean {
    if (!this.cache) {
      return false;
    }

    const now = Date.now();
    return now < this.cache.expiresAt;
  }

  /**
   * Обновляет кэш каталога.
   *
   * @param catalog - Новый каталог для кэширования.
   */
  private updateCache(catalog: ModelCatalog): void {
    const now = Date.now();
    this.cache = {
      catalog,
      timestamp: now,
      expiresAt: now + this.config.cacheTimeout,
    };
  }
}

/**
 * Создает экземпляр ModelCatalogService с настройками по умолчанию.
 *
 * @param config - Опциональная конфигурация.
 * @returns Экземпляр ModelCatalogService.
 */
export function createModelCatalogService(
  config?: Partial<ModelCatalogConfig>
): ModelCatalogService {
  return new ModelCatalogService(config);
}
