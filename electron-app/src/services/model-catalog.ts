/**
 * @module ModelCatalog
 * Сервис для получения каталога моделей Ollama.
 * Реализует кэширование, фильтрацию и поиск по моделям.
 */

import { OllamaApi } from './ollama-api';
import { OllamaHtmlParser, createOllamaHtmlParser } from '../utils/html-parser';
import { STATIC_MODELS, DEFAULT_CATALOG_CONFIG } from '../constants/catalog';
import type {
  ModelCatalogConfig,
  CachedCatalog,
  ModelCatalog,
  ModelFilters,
  OllamaModelInfo,
  OllamaOperationResult,
} from '../types';

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
  private htmlParser: OllamaHtmlParser;

  /**
   * Создает экземпляр ModelCatalogService.
   *
   * @param config - Конфигурация сервиса.
   */
  constructor(config?: Partial<ModelCatalogConfig>) {
    this.config = {
      ...DEFAULT_CATALOG_CONFIG,
      ...config,
    };
    this.ollamaApi = new OllamaApi({ baseUrl: this.config.ollamaUrl });
    this.htmlParser = createOllamaHtmlParser();
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
    try {
      if (!forceRefresh && this.isCacheValid() && this.cache) {
        return {
          success: true,
          data: this.cache.catalog,
          status: 'success',
        };
      }

      // Получает локально установленные модели
      const localModels = await this.getLocalModels();

      // Получает модели из Ollama Library через HTML парсинг
      const libraryModels = await this.getLibraryModels();

      // Создает каталог, объединяя локальные и библиотечные модели
      const catalog = this.createCombinedCatalog(localModels, libraryModels);

      // Сохраняет в кэш
      this.updateCache(catalog);

      return {
        success: true,
        data: catalog,
        status: 'success',
      };
    } catch (error) {
      console.error('❌ Error getting the model catalog:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '❌ Unknown error',
        status: 'error',
      };
    }
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
          error: '❌ Failed to get catalog',
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
        `❌ Error getting information about the model: ${modelName}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : '❌ Unknown error',
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
          error: '❌ Failed to get catalog',
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
      console.error('❌ Model search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '❌ Unknown error',
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
   * Получает модели из Ollama Library через HTML парсинг.
   * Использует квантизированные модели для получения полного каталога.
   * При отсутствии интернета возвращает пустой список для graceful fallback.
   *
   * @returns Promise со списком библиотечных моделей.
   */
  private async getLibraryModels(): Promise<OllamaModelInfo[]> {
    try {
      const parseResult = await this.htmlParser.getAvailableModels();

      if (!parseResult.success) {
        console.warn(
          "⚠️ Couldn't get models from the Ollama Library, using a static list"
        );
        return this.getStaticModels();
      }

      // Используем квантизированные модели если они доступны
      if (
        parseResult.quantizedModels &&
        parseResult.quantizedModels.length > 0
      ) {
        return parseResult.quantizedModels.map((model, index) => ({
          id: `library-${model.fullName}-${index}`,
          name: model.fullName,
          displayName: model.fullName,
          description:
            model.description || `Модель ${model.fullName} из Ollama`,
          version: model.tag,
          size: model.size || 0,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          type: 'ollama' as const,
          format: 'gguf',
          parameterSize: this.extractParameterSize(model.baseName),
          quantizationLevel: this.extractQuantizationLevel(model.tag),
          tags: model.tags || ['library'],
        }));
      }

      // Fallback на базовые модели если квантизированные недоступны
      if (parseResult.models && parseResult.models.length > 0) {
        return parseResult.models.map((model, index) => ({
          id: `library-${model.name}-${index}`,
          name: model.name,
          displayName: model.name,
          description: model.description || `Модель ${model.name} из Ollama`,
          version: 'latest',
          size: model.size || 0,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          type: 'ollama' as const,
          format: 'gguf',
          parameterSize: this.extractParameterSize(model.name),
          quantizationLevel: this.extractQuantizationLevel(model.name),
          tags: model.tags || ['library'],
        }));
      }

      console.warn(
        '⚠️ There are no available models from the Ollama Library, we use a static one'
      );
      return this.getStaticModels();
    } catch (error) {
      // При сетевых ошибках возвращаем пустой список для graceful fallback
      // Это позволяет приложению запускаться только с локальными моделями
      console.warn(
        '⚠️ Network error getting models from Ollama Library, using only local models:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return [];
    }
  }

  /**
   * Получает статический список моделей как fallback.
   *
   * @returns Список статических моделей.
   */
  private getStaticModels(): OllamaModelInfo[] {
    return STATIC_MODELS.map((model, index) => ({
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
      parameterSize: this.extractParameterSize(model.name),
      quantizationLevel: this.extractQuantizationLevel(model.name),
      tags: model.tags,
    }));
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
   * Извлекает размер параметров из названия модели.
   *
   * @param modelName - Название модели.
   * @returns Размер параметров.
   */
  private extractParameterSize(modelName: string): string {
    // Извлечение размера из названия модели (например, llama2:7b, llama2:13b)
    const sizeMatch = modelName.match(/(\d+(?:\.\d+)?)(b|m|k)/i);
    if (sizeMatch && sizeMatch[1] && sizeMatch[2]) {
      return `${sizeMatch[1]}${sizeMatch[2].toUpperCase()}`;
    }
    return 'Unknown';
  }

  /**
   * Извлекает уровень квантизации из названия модели или тега.
   *
   * @param modelNameOrTag - Название модели или тег квантизации.
   * @returns Уровень квантизации.
   */
  private extractQuantizationLevel(modelNameOrTag: string): string {
    // Извлечение квантизации из названия модели или тега (например, q4_0, q8_0)
    const quantMatch = modelNameOrTag.match(/q(\d+)_(\d+)/i);
    if (quantMatch) {
      return `Q${quantMatch[1]}_${quantMatch[2]}`;
    }

    // Проверяем другие форматы квантизации
    if (modelNameOrTag.includes('latest')) {
      return 'Latest';
    }

    if (modelNameOrTag.includes('fp16')) {
      return 'FP16';
    }

    if (modelNameOrTag.includes('fp32')) {
      return 'FP32';
    }

    return 'Unknown';
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
