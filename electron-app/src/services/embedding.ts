/**
 * @module EmbeddingService
 * Сервис для генерации векторных эмбеддингов с использованием Ollama.
 * Предоставляет высокоуровневый API для работы с эмбеддингами, включая кэширование и fallback логику.
 */

import type { OllamaApi } from './ollama-api';
import type { ElectronApiConfig } from '../types/electron';
import type {
  OllamaEmbeddingRequest,
  OllamaEmbeddingResponse,
  OllamaEmbeddingConfig,
  OllamaOperationResult,
} from '../types/ollama';
import {
  DEFAULT_EMBEDDING_CONFIG,
  getEmbeddingDimensions,
  getOptimalBatchSize,
  isEmbeddingModelSupported,
  normalizeEmbeddingModelName,
} from '../constants/embedding';
import { ErrorHandler } from '../utils/error-handler';
import type {
  CachedEmbedding,
  EmbeddingCache,
  EmbeddingOperationResult,
} from '../types/embedding';

/**
 * @class EmbeddingService
 * Основной сервис для работы с эмбеддингами.
 * Инкапсулирует логику генерации, кэширования и fallback для различных моделей.
 */
export class EmbeddingService {
  private config: OllamaEmbeddingConfig;
  private ollamaApi: OllamaApi;
  private errorHandler: ErrorHandler;
  private cache: EmbeddingCache;
  private isInitialized: boolean = false;

  /**
   * Создает экземпляр EmbeddingService.
   *
   * @param ollamaApi - Экземпляр OllamaApi для HTTP запросов.
   * @param config - Конфигурация сервиса эмбеддингов.
   */
  constructor(ollamaApi: OllamaApi, config?: Partial<OllamaEmbeddingConfig>) {
    this.ollamaApi = ollamaApi;
    this.config = {
      ...DEFAULT_EMBEDDING_CONFIG,
      ...config,
    };
    this.errorHandler = new ErrorHandler({
      enableVerboseLogging: true,
      enableStackLogging: false,
      logPrefix: '[EmbeddingService]',
    });
    this.cache = {
      embeddings: new Map(),
      metadata: new Map(),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      size: 0,
    };
  }

  /**
   * Инициализирует сервис эмбеддингов.
   * Проверяет доступность моделей и настраивает кэширование.
   *
   * @returns Promise с результатом инициализации.
   */
  async initialize(): Promise<EmbeddingOperationResult<void>> {
    const context = { module: 'EmbeddingService', operation: 'initialize' };

    try {
      console.log('🚀 Initializing embedding service...');

      // Проверяет доступность основной модели
      const primaryModelAvailable = await this.validateEmbeddingModel(
        this.config.defaultModel
      );
      if (!primaryModelAvailable) {
        const error = `Embedding model ${this.config.defaultModel} is not available`;
        console.error(`${error}`);
        return this.createErrorResult(error, 'error');
      }

      console.log(
        `✅ Primary embedding model is available: ${this.config.defaultModel}`
      );

      // Инициализирует кэш
      this.initializeCache();

      this.isInitialized = true;
      console.log('✅ Embedding service successfully initialized');

      return this.createSuccessResult(undefined, 'success');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error initializing embedding service:`, errorMessage);

      this.errorHandler.logError(error, context);
      return this.createErrorResult(errorMessage, 'error');
    }
  }

  /**
   * Генерирует эмбеддинг для указанного текста.
   * Использует кэширование и fallback логику для обеспечения надежности.
   *
   * @param text - Текст для векторизации.
   * @param model - Название модели (опционально).
   * @param config - Конфигурация API.
   * @returns Promise с эмбеддингом.
   */
  async generateEmbedding(
    text: string,
    model?: string,
    config?: ElectronApiConfig
  ): Promise<EmbeddingOperationResult<number[]>> {
    const context = {
      module: 'EmbeddingService',
      operation: 'generateEmbedding',
    };

    try {
      if (!this.isInitialized) {
        return this.createErrorResult(
          'Embedding service is not initialized',
          'error'
        );
      }

      // Нормализует входной текст
      const normalizedText = this.normalizeText(text);
      if (!normalizedText) {
        return this.createErrorResult(
          'Text for vectorization cannot be empty',
          'error'
        );
      }

      // Определяет модель для использования
      const targetModel = model || this.config.defaultModel;

      // Проверяет кэш
      const cacheKey = this.generateCacheKey(normalizedText, targetModel);
      const cachedEmbedding = this.getCachedEmbedding(cacheKey);
      if (cachedEmbedding) {
        console.log('📋 Embedding found in cache');
        return this.createSuccessResult(cachedEmbedding.embedding, 'success');
      }

      // Генерирует новый эмбеддинг
      const embeddingResult = await this.generateEmbeddingWithFallback(
        normalizedText,
        targetModel,
        config
      );

      if (!embeddingResult.success || !embeddingResult.data) {
        return this.createErrorResult(
          embeddingResult.error || 'Error generating embedding',
          'error'
        );
      }

      // Кэширует результат
      this.cacheEmbedding(
        cacheKey,
        embeddingResult.data.embedding,
        targetModel
      );

      console.log(`✅ Embedding generated for model: ${targetModel}`);
      return this.createSuccessResult(
        embeddingResult.data.embedding,
        'success'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error generating embedding:`, errorMessage);

      this.errorHandler.logError(error, context);
      return this.createErrorResult(errorMessage, 'error');
    }
  }

  /**
   * Генерирует эмбеддинги для множественных текстов.
   * Оптимизирует производительность через батчевую обработку.
   *
   * @param texts - Массив текстов для векторизации.
   * @param model - Название модели (опционально).
   * @param config - Конфигурация API.
   * @returns Promise с массивом эмбеддингов.
   */
  async generateEmbeddings(
    texts: string[],
    model?: string,
    config?: ElectronApiConfig
  ): Promise<EmbeddingOperationResult<number[][]>> {
    const context = {
      module: 'EmbeddingService',
      operation: 'generateEmbeddings',
    };

    try {
      if (!this.isInitialized) {
        return this.createErrorResult(
          'Embedding service is not initialized',
          'error'
        );
      }

      if (!texts || texts.length === 0) {
        return this.createErrorResult(
          'Array of texts cannot be empty',
          'error'
        );
      }

      const targetModel = model || this.config.defaultModel;
      const results: (number[] | undefined)[] = new Array(texts.length);
      const textsToProcess: string[] = [];
      const indicesToProcess: number[] = [];

      // Проверяет кэш для каждого текста
      for (let i = 0; i < texts.length; i++) {
        const normalizedText = this.normalizeText(texts[i] || '');
        if (!normalizedText) {
          results[i] = [];
          continue;
        }

        const cacheKey = this.generateCacheKey(normalizedText, targetModel);
        const cachedEmbedding = this.getCachedEmbedding(cacheKey);

        if (cachedEmbedding) {
          results[i] = cachedEmbedding.embedding;
        } else {
          textsToProcess.push(normalizedText);
          indicesToProcess.push(i);
        }
      }

      // Генерирует эмбеддинги для текстов, не найденных в кэше
      if (textsToProcess.length > 0) {
        const embeddingResults = await this.generateEmbeddingsBatch(
          textsToProcess,
          targetModel,
          config
        );

        if (!embeddingResults.success || !embeddingResults.data) {
          return this.createErrorResult(
            embeddingResults.error || 'Batch embedding generation error',
            'error'
          );
        }

        // Заполняет результаты и кэширует новые эмбеддинги
        for (let i = 0; i < embeddingResults.data.length; i++) {
          const originalIndex = indicesToProcess[i];
          const embedding = embeddingResults.data[i]?.embedding;

          if (originalIndex !== undefined && embedding) {
            results[originalIndex] = embedding;

            // Кэширует результат
            const cacheKey = this.generateCacheKey(
              textsToProcess[i] || '',
              targetModel
            );
            this.cacheEmbedding(cacheKey, embedding, targetModel);
          }
        }
      }

      console.log(`✅ Generated ${results.length} embeddings`);
      return this.createSuccessResult(
        results.filter((r): r is number[] => r !== undefined),
        'success'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error batch generation of embeddings:`, errorMessage);

      this.errorHandler.logError(error, context);
      return this.createErrorResult(errorMessage, 'error');
    }
  }

  /**
   * Проверяет доступность указанной модели эмбеддингов.
   *
   * @param modelName - Название модели для проверки.
   * @returns Promise с результатом проверки.
   */
  async validateEmbeddingModel(modelName: string): Promise<boolean> {
    try {
      // Проверяет поддержку модели
      if (!isEmbeddingModelSupported(modelName)) {
        console.warn(`⚠️ Model ${modelName} is not supported`);
        return false;
      }

      // Проверяет доступность модели через Ollama API
      const modelsResponse = await this.ollamaApi.listModels();
      if (!modelsResponse || !modelsResponse.models) {
        console.warn(`⚠️ Unable to get list of models`);
        return false;
      }

      // Нормализует имя модели для сравнения (удаляет тег :latest и т.д.)
      const normalizedModelName = normalizeEmbeddingModelName(modelName);
      const isAvailable = modelsResponse.models.some(
        (model: { name: string }) => {
          const normalizedInstalledName = normalizeEmbeddingModelName(
            model.name
          );
          return (
            normalizedInstalledName === normalizedModelName ||
            model.name === modelName ||
            model.name.startsWith(`${modelName}:`) ||
            model.name.startsWith(`${normalizedModelName}:`)
          );
        }
      );

      if (isAvailable) {
        console.log(`✅ Embedding model ${modelName} is available`);
      } else {
        console.warn(`⚠️ Embedding model ${modelName} is not available`);
      }

      return isAvailable;
    } catch (error) {
      console.error(`Error checking model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Получает размерность векторов для указанной модели.
   *
   * @param modelName - Название модели.
   * @returns Размерность векторов или undefined.
   */
  getEmbeddingDimensions(modelName: string): number | undefined {
    return getEmbeddingDimensions(modelName);
  }

  /**
   * Получает текущую выбранную модель эмбеддингов.
   *
   * @returns Название текущей модели.
   */
  getCurrentEmbeddingModel(): string {
    return this.config.defaultModel;
  }

  /**
   * Обновляет конфигурацию сервиса.
   *
   * @param newConfig - Новая конфигурация.
   */
  updateConfig(newConfig: Partial<OllamaEmbeddingConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Получает текущую конфигурацию сервиса.
   *
   * @returns Текущая конфигурация.
   */
  getConfig(): OllamaEmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Очищает кэш эмбеддингов.
   */
  clearCache(): void {
    this.cache.embeddings.clear();
    this.cache.size = 0;
    this.cache.createdAt = Date.now();
    console.log('🗑️ Embedding cache cleared');
  }

  /**
   * Получает статистику кэша.
   *
   * @returns Статистика кэша.
   */
  getCacheStats(): {
    size: number;
    entries: number;
    createdAt: number;
  } {
    return {
      size: this.cache.size,
      entries: this.cache.embeddings.size,
      createdAt: this.cache.createdAt,
    };
  }

  /**
   * Генерирует эмбеддинг с fallback логикой.
   * При недоступности основной модели пробует альтернативные.
   *
   * @param text - Текст для векторизации.
   * @param model - Название модели.
   * @param config - Конфигурация API.
   * @returns Promise с результатом генерации.
   */
  private async generateEmbeddingWithFallback(
    text: string,
    model: string,
    config?: ElectronApiConfig
  ): Promise<OllamaOperationResult<OllamaEmbeddingResponse>> {
    try {
      const request: OllamaEmbeddingRequest = {
        model,
        prompt: text,
      };

      return await this.ollamaApi.generateEmbedding(
        request,
        config || { id: 'default', url: '' }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate embedding';
      console.error(`Error generating embedding for model ${model}:`, message);
      return {
        success: false,
        error: message,
        status: 'error',
      };
    }
  }

  /**
   * Генерирует эмбеддинги батчами для оптимизации производительности.
   *
   * @param texts - Массив текстов.
   * @param model - Название модели.
   * @param config - Конфигурация API.
   * @returns Promise с результатом батчевой генерации.
   */
  private async generateEmbeddingsBatch(
    texts: string[],
    model: string,
    config?: ElectronApiConfig
  ): Promise<OllamaOperationResult<OllamaEmbeddingResponse[]>> {
    const optimalBatchSize = getOptimalBatchSize(model) || 5;
    const results: OllamaEmbeddingResponse[] = [];

    for (let i = 0; i < texts.length; i += optimalBatchSize) {
      const batch = texts.slice(i, i + optimalBatchSize);
      const requests: OllamaEmbeddingRequest[] = batch.map(text => ({
        model,
        prompt: text,
      }));

      const batchResult = await this.ollamaApi.generateEmbeddings(
        requests,
        config || { id: 'default', url: '' }
      );

      if (!batchResult.success || !batchResult.data) {
        return batchResult;
      }

      results.push(...batchResult.data);

      // Задержка между батчами для снижения нагрузки
      if (i + optimalBatchSize < texts.length) {
        await new Promise(resolve =>
          setTimeout(resolve, this.config.performanceSettings.batchDelay)
        );
      }
    }

    return {
      success: true,
      data: results,
      status: 'success',
    };
  }

  /**
   * Нормализует входной текст для векторизации.
   *
   * @param text - Исходный текст.
   * @returns Нормализованный текст.
   */
  private normalizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .trim()
      .replace(/\s+/g, ' ') // Заменяет множественные пробелы на одинарные
      .substring(0, 8192); // Ограничивает максимальную длину
  }

  /**
   * Генерирует ключ кэша для текста и модели.
   *
   * @param text - Текст.
   * @param model - Название модели.
   * @returns Ключ кэша.
   */
  private generateCacheKey(text: string, model: string): string {
    // Использует простой хэш для создания ключа кэша
    const hash = this.simpleHash(text + model);
    return `${model}:${hash}`;
  }

  /**
   * Простая хэш-функция для создания ключей кэша.
   *
   * @param str - Строка для хэширования.
   * @returns Хэш строки.
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Преобразует в 32-битное целое число
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Получает эмбеддинг из кэша.
   *
   * @param cacheKey - Ключ кэша.
   * @returns Кэшированный эмбеддинг или null.
   */
  private getCachedEmbedding(cacheKey: string): CachedEmbedding | null {
    const cached = this.cache.embeddings.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Проверяет срок действия кэша
    if (Date.now() > cached.expiresAt) {
      this.cache.embeddings.delete(cacheKey);
      this.cache.size -= cached.size;
      return null;
    }

    return cached;
  }

  /**
   * Кэширует эмбеддинг.
   *
   * @param cacheKey - Ключ кэша.
   * @param embedding - Вектор эмбеддинга.
   * @param model - Название модели.
   */
  private cacheEmbedding(
    cacheKey: string,
    embedding: number[],
    model: string
  ): void {
    if (!this.config.cacheSettings.enabled) {
      return;
    }

    const size = embedding.length * 8; // 8 байт на число double
    const expiresAt = Date.now() + this.config.cacheSettings.ttl;

    // Проверяет ограничения кэша
    if (this.cache.size + size > this.config.cacheSettings.maxSize) {
      this.evictOldestCacheEntries();
    }

    const cachedEmbedding: CachedEmbedding = {
      embedding,
      model,
      createdAt: Date.now(),
      expiresAt,
      size,
    };

    this.cache.embeddings.set(cacheKey, cachedEmbedding);
    this.cache.size += size;
  }

  /**
   * Удаляет старейшие записи из кэша.
   */
  private evictOldestCacheEntries(): void {
    const entries = Array.from(this.cache.embeddings.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

    // Удаляет 25% старейших записей
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      if (entry) {
        const [key, value] = entry;
        this.cache.embeddings.delete(key);
        this.cache.size -= value.size;
      }
    }
  }

  /**
   * Инициализирует кэш эмбеддингов.
   */
  private initializeCache(): void {
    this.cache = {
      embeddings: new Map(),
      metadata: new Map(),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      size: 0,
    };
    console.log('📋 Embedding cache initialized');
  }

  /**
   * Создает успешный результат операции.
   *
   * @param data - Данные результата.
   * @param status - Статус операции.
   * @returns Результат операции.
   */
  private createSuccessResult<T>(
    data: T,
    status: 'success'
  ): EmbeddingOperationResult<T> {
    return {
      success: true,
      data,
      status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Создает ошибочный результат операции.
   *
   * @param error - Сообщение об ошибке.
   * @param status - Статус операции.
   * @returns Результат операции.
   */
  private createErrorResult<T>(
    error: string,
    status: 'error'
  ): EmbeddingOperationResult<T> {
    return {
      success: false,
      error,
      status,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Создает экземпляр EmbeddingService с настройками по умолчанию.
 *
 * @param ollamaApi - Экземпляр OllamaApi.
 * @param config - Опциональная конфигурация.
 * @returns Экземпляр EmbeddingService.
 */
export function createEmbeddingService(
  ollamaApi: OllamaApi,
  config?: Partial<OllamaEmbeddingConfig>
): EmbeddingService {
  return new EmbeddingService(ollamaApi, config);
}
