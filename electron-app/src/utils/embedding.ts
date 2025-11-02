// NOTE: Архитектурная заготовка для оптимизации работы с эмбеддингами

/**
 * @module EmbeddingUtils
 * Утилиты для работы с эмбеддингами в RAG системе.
 * Предоставляет функции для нормализации, сравнения, сжатия и оптимизации векторных представлений.
 */

import { ErrorHandler } from './error-handler';
import {
  EMBEDDING_MODELS,
  EMBEDDING_DIMENSIONS,
  OPTIMAL_BATCH_SIZES,
  PERFORMANCE_SETTINGS,
} from '../constants/embedding';
import type { OperationContext } from '../types/error-handler';
import type {
  EmbeddingOperationResult,
  SimilarityMetrics,
  BatchProcessingConfig,
  CompressionResult,
  EmbeddingCache,
  CachedEmbedding,
} from '../types/embedding';

/**
 * Класс для работы с эмбеддингами.
 * Предоставляет утилиты для нормализации, сравнения, сжатия и оптимизации векторных представлений.
 */
export class EmbeddingUtils {
  private errorHandler: ErrorHandler;
  private cache: EmbeddingCache;
  private performanceMetrics: Map<string, number[]>;

  constructor(errorHandler?: ErrorHandler) {
    this.errorHandler = errorHandler || new ErrorHandler();
    this.cache = {
      embeddings: new Map(),
      metadata: new Map(),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      size: 0,
    };
    this.performanceMetrics = new Map();
  }

  /**
   * Нормализует вектор эмбеддинга к единичной длине.
   * Нормализация улучшает качество сравнения векторов и стабилизирует вычисления.
   *
   * @param embedding - Вектор эмбеддинга для нормализации
   * @param model - Модель эмбеддингов для валидации размерности
   * @returns Результат нормализации с нормализованным вектором
   */
  async normalizeEmbedding(
    embedding: number[],
    model?: string
  ): Promise<EmbeddingOperationResult<number[]>> {
    const context: OperationContext = {
      module: 'EmbeddingUtils',
      operation: 'normalizeEmbedding',
      params: { model, dimensions: embedding.length },
    };

    try {
      // Валидация входных данных
      const validationResult = this.validateEmbeddingInput(embedding, model);
      if (!validationResult.success) {
        return this.createErrorResult(
          validationResult.error || 'Validation failed',
          context
        );
      }

      const startTime = performance.now();

      // Вычисление нормы вектора
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );

      // Проверка на нулевую норму для предотвращения деления на ноль
      if (magnitude === 0) {
        return this.createErrorResult('Cannot normalize zero vector', context);
      }

      // Нормализация вектора
      const normalizedEmbedding = embedding.map(val => val / magnitude);

      const processingTime = performance.now() - startTime;

      // Кэширование результата
      const cacheKey = this.generateCacheKey(embedding, model);
      this.cacheEmbedding(cacheKey, normalizedEmbedding, model || 'unknown');

      // Обновление метрик производительности
      this.updatePerformanceMetrics('normalizeEmbedding', processingTime);

      return this.createSuccessResult(normalizedEmbedding, context, {
        model,
        dimensions: embedding.length,
        processingTime,
      });
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Вычисляет схожесть между двумя эмбеддингами используя различные метрики.
   * Поддерживает косинусное сходство, евклидово расстояние и другие метрики.
   *
   * @param embedding1 - Первый вектор эмбеддинга
   * @param embedding2 - Второй вектор эмбеддинга
   * @param metrics - Массив метрик для вычисления
   * @returns Результат с вычисленными метриками схожести
   */
  async calculateSimilarity(
    embedding1: number[],
    embedding2: number[],
    metrics: (keyof SimilarityMetrics)[] = ['cosine', 'euclidean', 'dotProduct']
  ): Promise<EmbeddingOperationResult<SimilarityMetrics>> {
    const context: OperationContext = {
      module: 'EmbeddingUtils',
      operation: 'calculateSimilarity',
      params: {
        dimensions1: embedding1.length,
        dimensions2: embedding2.length,
        metrics,
      },
    };

    try {
      // Валидация входных данных
      if (embedding1.length !== embedding2.length) {
        return this.createErrorResult(
          `Dimension mismatch: ${embedding1.length} vs ${embedding2.length}`,
          context
        );
      }

      const startTime = performance.now();
      const result: SimilarityMetrics = {} as SimilarityMetrics;

      // Вычисление косинусного сходства
      if (metrics.includes('cosine')) {
        const dotProduct = embedding1.reduce(
          (sum, val, i) => sum + val * (embedding2[i] || 0),
          0
        );
        const magnitude1 = Math.sqrt(
          embedding1.reduce((sum, val) => sum + val * val, 0)
        );
        const magnitude2 = Math.sqrt(
          embedding2.reduce((sum, val) => sum + val * val, 0)
        );

        if (magnitude1 === 0 || magnitude2 === 0) {
          result.cosine = 0;
        } else {
          result.cosine = dotProduct / (magnitude1 * magnitude2);
        }
      }

      // Вычисление евклидова расстояния
      if (metrics.includes('euclidean')) {
        const sumSquaredDiffs = embedding1.reduce(
          (sum, val, i) => sum + Math.pow(val - (embedding2[i] || 0), 2),
          0
        );
        result.euclidean = Math.sqrt(sumSquaredDiffs);
      }

      // Вычисление скалярного произведения
      if (metrics.includes('dotProduct')) {
        result.dotProduct = embedding1.reduce(
          (sum, val, i) => sum + val * (embedding2[i] || 0),
          0
        );
      }

      // Вычисление манхэттенского расстояния
      if (metrics.includes('manhattan')) {
        result.manhattan = embedding1.reduce(
          (sum, val, i) => sum + Math.abs(val - (embedding2[i] || 0)),
          0
        );
      }

      const processingTime = performance.now() - startTime;

      // Обновление метрик производительности
      this.updatePerformanceMetrics('calculateSimilarity', processingTime);

      return this.createSuccessResult(result, context, {
        dimensions: embedding1.length,
        processingTime,
      });
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Оптимизирует батчевую обработку эмбеддингов.
   * Разбивает большие массивы на оптимальные батчи для эффективной обработки.
   *
   * @param embeddings - Массив эмбеддингов для обработки
   * @param config - Конфигурация батчевой обработки
   * @param processor - Функция для обработки каждого батча
   * @returns Результат батчевой обработки
   */
  async batchEmbeddings<T>(
    embeddings: number[][],
    config: Partial<BatchProcessingConfig>,
    processor: (batch: number[][]) => Promise<T[]>
  ): Promise<EmbeddingOperationResult<T[]>> {
    const context: OperationContext = {
      module: 'EmbeddingUtils',
      operation: 'batchEmbeddings',
      params: {
        totalEmbeddings: embeddings.length,
        batchSize: config.batchSize,
      },
    };

    try {
      const batchConfig: BatchProcessingConfig = {
        batchSize: OPTIMAL_BATCH_SIZES[EMBEDDING_MODELS.PRIMARY],
        maxConcurrentOperations: PERFORMANCE_SETTINGS.MAX_CONCURRENT_REQUESTS,
        batchDelay: PERFORMANCE_SETTINGS.BATCH_DELAY,
        enableProgressTracking: true,
        ...config,
      };

      const startTime = performance.now();
      const results: T[] = [];
      const batches: number[][][] = [];

      // Разбиение на батчи
      for (let i = 0; i < embeddings.length; i += batchConfig.batchSize) {
        batches.push(embeddings.slice(i, i + batchConfig.batchSize));
      }

      // Обработка батчей с ограничением параллелизма
      const semaphore = new Array(batchConfig.maxConcurrentOperations).fill(
        null
      );
      let batchIndex = 0;

      while (batchIndex < batches.length) {
        const promises = semaphore.map(async _ => {
          if (batchIndex >= batches.length) return null;

          const batch = batches[batchIndex++];
          if (!batch) return null;

          const batchResult = await processor(batch);

          // Задержка между батчами для предотвращения перегрузки
          if (batchConfig.batchDelay > 0) {
            await new Promise(resolve =>
              setTimeout(resolve, batchConfig.batchDelay)
            );
          }

          return batchResult;
        });

        const batchResults = await Promise.all(promises);
        results.push(...batchResults.filter(result => result !== null).flat());
      }

      const processingTime = performance.now() - startTime;

      // Обновление метрик производительности
      this.updatePerformanceMetrics('batchEmbeddings', processingTime);

      return this.createSuccessResult(results, context, {
        processingTime,
        memoryStats: {
          usedMemory: this.getMemoryUsage(),
          peakMemory: this.getPeakMemoryUsage(),
        },
      });
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Проверяет совместимость размерности эмбеддингов с моделью.
   * Валидирует соответствие размерности векторов ожидаемой для конкретной модели.
   *
   * @param embedding - Вектор эмбеддинга для проверки
   * @param model - Модель эмбеддингов для сравнения
   * @returns Результат валидации с информацией о совместимости
   */
  async validateEmbeddingDimensions(
    embedding: number[],
    model: string
  ): Promise<EmbeddingOperationResult<boolean>> {
    const context: OperationContext = {
      module: 'EmbeddingUtils',
      operation: 'validateEmbeddingDimensions',
      params: { model, dimensions: embedding.length },
    };

    try {
      const expectedDimensions =
        EMBEDDING_DIMENSIONS[model as keyof typeof EMBEDDING_DIMENSIONS];

      if (!expectedDimensions) {
        return this.createErrorResult(`Unknown model: ${model}`, context);
      }

      const isValid = embedding.length === expectedDimensions;

      if (!isValid) {
        return this.createErrorResult(
          `Dimension mismatch: expected ${expectedDimensions}, got ${embedding.length}`,
          context
        );
      }

      return this.createSuccessResult(true, context, {
        model,
        dimensions: embedding.length,
      });
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Сжимает эмбеддинги для экономии места и ускорения операций.
   * Поддерживает различные методы сжатия включая квантизацию и PCA.
   *
   * @param embedding - Вектор эмбеддинга для сжатия
   * @param method - Метод сжатия
   * @param compressionLevel - Уровень сжатия (0-1)
   * @returns Результат сжатия с сжатыми данными
   */
  async compressEmbeddings(
    embedding: number[],
    method: 'quantization' | 'pca' | 'sparse' = 'quantization',
    compressionLevel: number = 0.5
  ): Promise<EmbeddingOperationResult<CompressionResult>> {
    const context: OperationContext = {
      module: 'EmbeddingUtils',
      operation: 'compressEmbeddings',
      params: { method, compressionLevel, dimensions: embedding.length },
    };

    try {
      const startTime = performance.now();
      const originalSize = embedding.length * 4; // 4 байта на число

      let compressedData: number[];
      let compressionRatio: number;

      switch (method) {
        case 'quantization':
          // Квантизация: уменьшение точности чисел
          const quantizedBits = Math.max(1, Math.floor(32 * compressionLevel));
          const maxValue = Math.max(...embedding.map(Math.abs));
          const scale = Math.pow(2, quantizedBits - 1) - 1;

          compressedData = embedding.map(val =>
            Math.round((val / maxValue) * scale)
          );
          compressionRatio = 32 / quantizedBits;
          break;

        case 'sparse':
          // Разреженное представление: сохранение только значимых значений
          const threshold =
            compressionLevel * Math.max(...embedding.map(Math.abs));
          compressedData = embedding.filter(val => Math.abs(val) > threshold);
          compressionRatio = embedding.length / compressedData.length;
          break;

        case 'pca':
          // PCA: уменьшение размерности (упрощенная реализация)
          const targetDimensions = Math.max(
            1,
            Math.floor(embedding.length * compressionLevel)
          );
          compressedData = embedding.slice(0, targetDimensions);
          compressionRatio = embedding.length / targetDimensions;
          break;

        default:
          return this.createErrorResult(
            `Unknown compression method: ${method}`,
            context
          );
      }

      const compressedSize = compressedData.length * 4;
      const result: CompressionResult = {
        compressedData,
        compressionRatio,
        originalSize,
        compressedSize,
        compressionMethod: method,
      };

      const processingTime = performance.now() - startTime;

      // Обновление метрик производительности
      this.updatePerformanceMetrics('compressEmbeddings', processingTime);

      return this.createSuccessResult(result, context, {
        dimensions: embedding.length,
        processingTime,
      });
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Объединяет несколько эмбеддингов в один вектор.
   * Поддерживает различные стратегии объединения включая усреднение и конкатенацию.
   *
   * @param embeddings - Массив эмбеддингов для объединения
   * @param strategy - Стратегия объединения
   * @param weights - Веса для взвешенного объединения
   * @returns Результат объединения с объединенным вектором
   */
  async mergeEmbeddings(
    embeddings: number[][],
    strategy: 'average' | 'concatenate' | 'weighted' = 'average',
    weights?: number[]
  ): Promise<EmbeddingOperationResult<number[]>> {
    const context: OperationContext = {
      module: 'EmbeddingUtils',
      operation: 'mergeEmbeddings',
      params: {
        embeddingsCount: embeddings.length,
        strategy,
        hasWeights: !!weights,
      },
    };

    try {
      if (embeddings.length === 0) {
        return this.createErrorResult('No embeddings to merge', context);
      }

      const startTime = performance.now();
      let mergedEmbedding: number[] = [];

      switch (strategy) {
        case 'average':
          // Усреднение эмбеддингов
          const dimensions = embeddings[0]?.length || 0;
          if (dimensions === 0) {
            return this.createErrorResult('First embedding is empty', context);
          }

          mergedEmbedding = Array.from({ length: dimensions }, () => 0);

          for (const embedding of embeddings) {
            if (!embedding || embedding.length !== dimensions) {
              return this.createErrorResult(
                `Dimension mismatch in embeddings: ${embedding?.length || 0} vs ${dimensions}`,
                context
              );
            }

            // После проверки embedding гарантированно не undefined
            for (let i = 0; i < dimensions; i++) {
              const value = mergedEmbedding[i] ?? 0;
              mergedEmbedding[i] = value + (embedding[i] ?? 0);
            }
          }

          // Нормализация по количеству эмбеддингов
          for (let i = 0; i < dimensions; i++) {
            const currentValue = mergedEmbedding[i] ?? 0;
            mergedEmbedding[i] = currentValue / embeddings.length;
          }
          break;

        case 'concatenate':
          // Конкатенация эмбеддингов
          mergedEmbedding = embeddings.flat();
          break;

        case 'weighted':
          // Взвешенное объединение
          if (!weights || weights.length !== embeddings.length) {
            return this.createErrorResult(
              'Weights array must match embeddings count',
              context
            );
          }

          const totalWeight = weights.reduce(
            (sum, weight) => sum + (weight || 0),
            0
          );
          if (totalWeight === 0) {
            return this.createErrorResult(
              'Total weight cannot be zero',
              context
            );
          }

          const weightedDimensions = embeddings[0]?.length || 0;
          if (weightedDimensions === 0) {
            return this.createErrorResult('First embedding is empty', context);
          }

          mergedEmbedding = Array.from({ length: weightedDimensions }, () => 0);

          for (let i = 0; i < embeddings.length; i++) {
            const embedding = embeddings[i];
            const weight = weights[i];

            if (!embedding || embedding.length !== weightedDimensions) {
              return this.createErrorResult(
                `Dimension mismatch in weighted merge: ${embedding?.length || 0} vs ${weightedDimensions}`,
                context
              );
            }

            // После проверки embedding гарантированно не undefined
            for (let j = 0; j < weightedDimensions; j++) {
              const currentValue = mergedEmbedding[j] ?? 0;
              mergedEmbedding[j] =
                currentValue + (embedding[j] ?? 0) * (weight ?? 0);
            }
          }

          // Нормализация по общему весу
          for (let i = 0; i < weightedDimensions; i++) {
            const currentValue = mergedEmbedding[i] ?? 0;
            mergedEmbedding[i] = currentValue / totalWeight;
          }
          break;

        default:
          return this.createErrorResult(
            `Unknown merge strategy: ${strategy}`,
            context
          );
      }

      const processingTime = performance.now() - startTime;

      // Обновление метрик производительности
      this.updatePerformanceMetrics('mergeEmbeddings', processingTime);

      return this.createSuccessResult(mergedEmbedding, context, {
        dimensions: mergedEmbedding.length,
        processingTime,
      });
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Получает статистику производительности операций с эмбеддингами.
   * Предоставляет метрики для мониторинга и оптимизации производительности.
   *
   * @returns Статистика производительности
   */
  getPerformanceStats(): Record<
    string,
    {
      count: number;
      averageTime: number;
      minTime: number;
      maxTime: number;
      totalTime: number;
    }
  > {
    const stats: Record<
      string,
      {
        count: number;
        averageTime: number;
        minTime: number;
        maxTime: number;
        totalTime: number;
      }
    > = {};

    for (const [operation, times] of this.performanceMetrics.entries()) {
      const count = times.length;
      const totalTime = times.reduce((sum, time) => sum + time, 0);
      const averageTime = totalTime / count;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      stats[operation] = {
        count,
        averageTime,
        minTime,
        maxTime,
        totalTime,
      };
    }

    return stats;
  }

  /**
   * Очищает кэш эмбеддингов для освобождения памяти.
   * Удаляет устаревшие записи и освобождает ресурсы.
   */
  clearCache(): void {
    this.cache.embeddings.clear();
    this.cache.metadata.clear();
    this.cache.createdAt = Date.now();
    this.cache.lastAccessedAt = Date.now();
    this.cache.size = 0;
  }

  /**
   * Получает размер кэша эмбеддингов.
   *
   * @returns Информация о размере кэша
   */
  getCacheStats(): {
    entriesCount: number;
    memoryUsage: number;
    createdAt: number;
    lastAccessedAt: number;
  } {
    const entriesCount = this.cache.embeddings.size;
    const memoryUsage = entriesCount * 768 * 4; // Примерная оценка

    return {
      entriesCount,
      memoryUsage,
      createdAt: this.cache.createdAt,
      lastAccessedAt: this.cache.lastAccessedAt,
    };
  }

  // Приватные методы

  /**
   * Валидирует входные данные эмбеддинга.
   * Проверяет корректность вектора и соответствие модели.
   */
  private validateEmbeddingInput(
    embedding: number[],
    model?: string
  ): { success: boolean; error?: string } {
    if (!Array.isArray(embedding)) {
      return { success: false, error: 'Embedding must be an array' };
    }

    if (embedding.length === 0) {
      return { success: false, error: 'Embedding cannot be empty' };
    }

    if (!embedding.every(val => typeof val === 'number' && !isNaN(val))) {
      return {
        success: false,
        error: 'Embedding must contain only valid numbers',
      };
    }

    if (model) {
      const expectedDimensions =
        EMBEDDING_DIMENSIONS[model as keyof typeof EMBEDDING_DIMENSIONS];
      if (expectedDimensions && embedding.length !== expectedDimensions) {
        return {
          success: false,
          error: `Expected ${expectedDimensions} dimensions for model ${model}, got ${embedding.length}`,
        };
      }
    }

    return { success: true };
  }

  /**
   * Генерирует ключ кэша для эмбеддинга.
   * Создает уникальный идентификатор для кэширования векторов.
   */
  private generateCacheKey(embedding: number[], model?: string): string {
    const hash = embedding.slice(0, 10).join(','); // Использует первые 10 значений для хэша
    return `${model || 'unknown'}_${hash}`;
  }

  /**
   * Кэширует эмбеддинг для повторного использования.
   * Сохраняет вектор и метаданные в кэше.
   */
  private cacheEmbedding(
    key: string,
    embedding: number[],
    model: string
  ): void {
    const cachedEmbedding: CachedEmbedding = {
      embedding,
      model,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 часа
      size: embedding.length * 8, // 8 байт на число double
    };

    this.cache.embeddings.set(key, cachedEmbedding);
    this.cache.metadata.set(key, {
      model,
      timestamp: Date.now(),
      dimensions: embedding.length,
      accessCount: 0,
    });
    this.cache.lastAccessedAt = Date.now();
    this.cache.size += cachedEmbedding.size;
  }

  /**
   * Обновляет метрики производительности для операции.
   * Отслеживает время выполнения операций для анализа производительности.
   */
  private updatePerformanceMetrics(operation: string, time: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }

    const times = this.performanceMetrics.get(operation);
    if (times) {
      times.push(time);

      // Ограничивает количество записей для предотвращения утечек памяти
      if (times.length > 1000) {
        times.splice(0, times.length - 1000);
      }
    }
  }

  /**
   * Получает текущее использование памяти.
   * Возвращает приблизительную оценку использования памяти.
   */
  private getMemoryUsage(): number {
    return this.cache.embeddings.size * 768 * 4; // Примерная оценка
  }

  /**
   * Получает пиковое использование памяти.
   * Возвращает максимальное использование памяти за время работы.
   */
  private getPeakMemoryUsage(): number {
    return this.getMemoryUsage(); // Упрощенная реализация
  }

  /**
   * Создает успешный результат операции.
   * Стандартизирует формат успешных результатов.
   */
  private createSuccessResult<T>(
    data: T,
    _context: OperationContext,
    additionalData?: Partial<EmbeddingOperationResult<T>>
  ): EmbeddingOperationResult<T> {
    return {
      success: true,
      data,
      status: 'success',
      timestamp: new Date().toISOString(),
      ...additionalData,
    };
  }

  /**
   * Создает результат ошибки операции.
   * Стандартизирует формат результатов с ошибками.
   */
  private createErrorResult<T>(
    error: string,
    _context: OperationContext
  ): EmbeddingOperationResult<T> {
    return {
      success: false,
      error,
      status: 'error',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Обрабатывает ошибки операций с эмбеддингами.
   * Использует ErrorHandler для централизованной обработки ошибок.
   */
  private handleError<T>(
    error: unknown,
    _context: OperationContext
  ): EmbeddingOperationResult<T> {
    const classifiedError = this.errorHandler.classifyError(error);

    return {
      success: false,
      error: classifiedError.message,
      status: 'error',
      timestamp: new Date().toISOString(),
    };
  }
}
/**
 * Создает экземпляр EmbeddingUtils с настройками по умолчанию.
 * Фабричная функция для упрощения создания утилит эмбеддингов.
 *
 * @param errorHandler - Опциональный обработчик ошибок
 * @returns Экземпляр EmbeddingUtils
 */
export function createEmbeddingUtils(
  errorHandler?: ErrorHandler
): EmbeddingUtils {
  return new EmbeddingUtils(errorHandler);
}

/**
 * Экспорт утилит для работы с эмбеддингами.
 * Предоставляет статические функции для простых операций.
 */
export const embeddingUtils = {
  /**
   * Быстрая нормализация эмбеддинга без создания экземпляра класса.
   * Оптимизирована для одноразовых операций.
   */
  normalize: (embedding: number[]): number[] => {
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    return magnitude === 0 ? embedding : embedding.map(val => val / magnitude);
  },

  /**
   * Быстрое вычисление косинусного сходства между двумя эмбеддингами.
   * Оптимизировано для частых операций сравнения.
   */
  cosineSimilarity: (embedding1: number[], embedding2: number[]): number => {
    const dotProduct = embedding1.reduce(
      (sum, val, i) => sum + val * (embedding2[i] || 0),
      0
    );
    const magnitude1 = Math.sqrt(
      embedding1.reduce((sum, val) => sum + val * val, 0)
    );
    const magnitude2 = Math.sqrt(
      embedding2.reduce((sum, val) => sum + val * val, 0)
    );

    return magnitude1 === 0 || magnitude2 === 0
      ? 0
      : dotProduct / (magnitude1 * magnitude2);
  },

  /**
   * Проверка совместимости размерности эмбеддинга с моделью.
   * Быстрая валидация без создания экземпляра класса.
   */
  validateDimensions: (embedding: number[], model: string): boolean => {
    const expectedDimensions =
      EMBEDDING_DIMENSIONS[model as keyof typeof EMBEDDING_DIMENSIONS];
    return expectedDimensions ? embedding.length === expectedDimensions : false;
  },
};
