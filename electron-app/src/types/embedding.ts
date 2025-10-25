/**
 * @module EmbeddingTypes
 * Типы для работы с эмбеддингами.
 */

import type { OperationResult } from './error-handler';

/**
 * Интерфейс для кэша эмбеддингов.
 * Определяет структуру для хранения и управления кэшированными векторами.
 */
export interface EmbeddingCache {
  /** Кэшированные эмбеддинги */
  embeddings: Map<string, CachedEmbedding>;
  /** Метаданные кэша */
  metadata: Map<
    string,
    {
      model: string;
      timestamp: number;
      dimensions: number;
      accessCount: number;
    }
  >;
  /** Время создания кэша */
  createdAt: number;
  /** Время последнего доступа */
  lastAccessedAt: number;
  /** Размер кэша в байтах */
  size: number;
}

/**
 * Кэшированный эмбеддинг с метаданными.
 */
export interface CachedEmbedding {
  /** Векторное представление текста */
  embedding: number[];
  /** Название модели, использованной для генерации */
  model: string;
  /** Время создания эмбеддинга */
  createdAt: number;
  /** Время истечения кэша */
  expiresAt: number;
  /** Размер в байтах */
  size: number;
}
/**
 * Интерфейс для результатов операций с эмбеддингами.
 * Расширяет базовый OperationResult специфичными для эмбеддингов полями.
 */
export interface EmbeddingOperationResult<T = unknown>
  extends OperationResult<T> {
  /** Модель эмбеддингов, использованная для операции */
  model?: string;
  /** Размерность векторов */
  dimensions?: number;
  /** Время выполнения операции в миллисекундах */
  processingTime?: number;
  /** Статистика использования памяти */
  memoryStats?: {
    /** Использованная память в байтах */
    usedMemory: number;
    /** Пиковое использование памяти в байтах */
    peakMemory: number;
  };
}

/**
 * Интерфейс для метрик схожести между эмбеддингами.
 * Определяет различные способы вычисления расстояния между векторами.
 */
export interface SimilarityMetrics {
  /** Косинусное сходство (0-1, где 1 - максимальное сходство) */
  cosine: number;
  /** Евклидово расстояние (чем меньше, тем больше сходство) */
  euclidean: number;
  /** Скалярное произведение */
  dotProduct: number;
  /** Манхэттенское расстояние */
  manhattan: number;
}

/**
 * Интерфейс для конфигурации батчевой обработки эмбеддингов.
 * Определяет параметры для оптимизации обработки множественных векторов.
 */
export interface BatchProcessingConfig {
  /** Размер батча для обработки */
  batchSize: number;
  /** Максимальное количество одновременных операций */
  maxConcurrentOperations: number;
  /** Задержка между батчами в миллисекундах */
  batchDelay: number;
  /** Включить прогресс-индикатор */
  enableProgressTracking: boolean;
}

/**
 * Интерфейс для результатов сжатия эмбеддингов.
 * Содержит информацию о сжатии и восстановлении векторов.
 */
export interface CompressionResult {
  /** Сжатые данные */
  compressedData: number[];
  /** Коэффициент сжатия */
  compressionRatio: number;
  /** Размер исходных данных в байтах */
  originalSize: number;
  /** Размер сжатых данных в байтах */
  compressedSize: number;
  /** Метод сжатия */
  compressionMethod: 'quantization' | 'pca' | 'sparse';
}
