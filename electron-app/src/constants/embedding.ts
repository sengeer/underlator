/**
 * @module EmbeddingConstants
 * Константы для работы с эмбеддингами через Ollama.
 * Определяет настройки по умолчанию и конфигурации для различных моделей эмбеддингов.
 */

import type { OllamaEmbeddingConfig } from '../types/ollama';

/**
 * Основные модели эмбеддингов, поддерживаемые Ollama.
 * Список проверенных и оптимизированных моделей для генерации векторных представлений.
 */
export const EMBEDDING_MODELS = {
  /** Основная модель эмбеддингов - embeddinggemma */
  PRIMARY: 'embeddinggemma',
  /** Альтернативная модель - mxbai-embed-large */
  FALLBACK_1: 'mxbai-embed-large',
  /** Дополнительная модель - all-minilm */
  FALLBACK_2: 'all-minilm',
  /** Модель для быстрых вычислений - bge-small-en */
  FAST: 'bge-small-en',
} as const;

/**
 * Размерности векторов для различных моделей эмбеддингов.
 * Используется для валидации и оптимизации векторных операций.
 */
export const EMBEDDING_DIMENSIONS = {
  [EMBEDDING_MODELS.PRIMARY]: 768,
  [EMBEDDING_MODELS.FALLBACK_1]: 1024,
  [EMBEDDING_MODELS.FALLBACK_2]: 384,
  [EMBEDDING_MODELS.FAST]: 384,
} as const;

/**
 * Максимальные длины входного текста для различных моделей.
 * Превышение лимита может привести к ошибкам или неполным эмбеддингам.
 */
export const MAX_INPUT_LENGTHS = {
  [EMBEDDING_MODELS.PRIMARY]: 8192,
  [EMBEDDING_MODELS.FALLBACK_1]: 512,
  [EMBEDDING_MODELS.FALLBACK_2]: 256,
  [EMBEDDING_MODELS.FAST]: 512,
} as const;

/**
 * Оптимальные размеры батчей для различных моделей.
 * Используется для оптимизации производительности при обработке множественных текстов.
 */
export const OPTIMAL_BATCH_SIZES = {
  [EMBEDDING_MODELS.PRIMARY]: 32,
  [EMBEDDING_MODELS.FALLBACK_1]: 16,
  [EMBEDDING_MODELS.FALLBACK_2]: 64,
  [EMBEDDING_MODELS.FAST]: 64,
} as const;

/**
 * Настройки производительности для эмбеддингов.
 * Оптимизированы для баланса скорости и качества генерации.
 */
export const PERFORMANCE_SETTINGS = {
  /** Максимальное количество одновременных запросов */
  MAX_CONCURRENT_REQUESTS: 5,
  /** Таймаут для запросов эмбеддингов в миллисекундах */
  REQUEST_TIMEOUT: 30000,
  /** Задержка между батчевыми запросами в миллисекундах */
  BATCH_DELAY: 100,
  /** Максимальное количество попыток при ошибках */
  MAX_RETRY_ATTEMPTS: 3,
  /** Базовая задержка между попытками в миллисекундах */
  RETRY_BASE_DELAY: 1000,
} as const;

/**
 * Настройки кэширования для эмбеддингов.
 * Позволяет избежать повторных вычислений для одинаковых текстов.
 */
export const CACHE_SETTINGS = {
  /** Включить кэширование эмбеддингов */
  ENABLED: true,
  /** Время жизни кэша в миллисекундах (24 часа) */
  TTL: 24 * 60 * 60 * 1000,
  /** Максимальный размер кэша в байтах (100 MB) */
  MAX_SIZE: 100 * 1024 * 1024,
  /** Максимальное количество записей в кэше */
  MAX_ENTRIES: 10000,
} as const;

/**
 * Конфигурация по умолчанию для сервиса эмбеддингов.
 * Содержит все необходимые настройки для работы с различными моделями.
 */
export const DEFAULT_EMBEDDING_CONFIG: OllamaEmbeddingConfig = {
  /** Основная модель эмбеддингов */
  defaultModel: EMBEDDING_MODELS.PRIMARY,
  /** Альтернативные модели в порядке приоритета */
  fallbackModels: [
    EMBEDDING_MODELS.FALLBACK_1,
    EMBEDDING_MODELS.FALLBACK_2,
    EMBEDDING_MODELS.FAST,
  ],
  /** Настройки для различных моделей */
  modelSettings: {
    [EMBEDDING_MODELS.PRIMARY]: {
      dimensions: EMBEDDING_DIMENSIONS[EMBEDDING_MODELS.PRIMARY],
      maxInputLength: MAX_INPUT_LENGTHS[EMBEDDING_MODELS.PRIMARY],
      optimalBatchSize: OPTIMAL_BATCH_SIZES[EMBEDDING_MODELS.PRIMARY],
      supportsBatchProcessing: true,
    },
    [EMBEDDING_MODELS.FALLBACK_1]: {
      dimensions: EMBEDDING_DIMENSIONS[EMBEDDING_MODELS.FALLBACK_1],
      maxInputLength: MAX_INPUT_LENGTHS[EMBEDDING_MODELS.FALLBACK_1],
      optimalBatchSize: OPTIMAL_BATCH_SIZES[EMBEDDING_MODELS.FALLBACK_1],
      supportsBatchProcessing: true,
    },
    [EMBEDDING_MODELS.FALLBACK_2]: {
      dimensions: EMBEDDING_DIMENSIONS[EMBEDDING_MODELS.FALLBACK_2],
      maxInputLength: MAX_INPUT_LENGTHS[EMBEDDING_MODELS.FALLBACK_2],
      optimalBatchSize: OPTIMAL_BATCH_SIZES[EMBEDDING_MODELS.FALLBACK_2],
      supportsBatchProcessing: false,
    },
    [EMBEDDING_MODELS.FAST]: {
      dimensions: EMBEDDING_DIMENSIONS[EMBEDDING_MODELS.FAST],
      maxInputLength: MAX_INPUT_LENGTHS[EMBEDDING_MODELS.FAST],
      optimalBatchSize: OPTIMAL_BATCH_SIZES[EMBEDDING_MODELS.FAST],
      supportsBatchProcessing: true,
    },
  },
  /** Настройки кэширования */
  cacheSettings: {
    enabled: CACHE_SETTINGS.ENABLED,
    ttl: CACHE_SETTINGS.TTL,
    maxSize: CACHE_SETTINGS.MAX_SIZE,
  },
  /** Настройки производительности */
  performanceSettings: {
    maxConcurrentRequests: PERFORMANCE_SETTINGS.MAX_CONCURRENT_REQUESTS,
    requestTimeout: PERFORMANCE_SETTINGS.REQUEST_TIMEOUT,
    batchDelay: PERFORMANCE_SETTINGS.BATCH_DELAY,
  },
};

/**
 * Проверяет, поддерживается ли указанная модель эмбеддингов.
 * @param modelName - Название модели для проверки
 * @returns true если модель поддерживается
 */
export function isEmbeddingModelSupported(modelName: string): boolean {
  return Object.values(EMBEDDING_MODELS).includes(
    modelName as (typeof EMBEDDING_MODELS)[keyof typeof EMBEDDING_MODELS]
  );
}

/**
 * Получает размерность векторов для указанной модели.
 * @param modelName - Название модели
 * @returns Размерность векторов или undefined если модель не поддерживается
 */
export function getEmbeddingDimensions(modelName: string): number | undefined {
  return EMBEDDING_DIMENSIONS[modelName as keyof typeof EMBEDDING_DIMENSIONS];
}

/**
 * Получает максимальную длину входного текста для указанной модели.
 * @param modelName - Название модели
 * @returns Максимальная длина или undefined если модель не поддерживается
 */
export function getMaxInputLength(modelName: string): number | undefined {
  return MAX_INPUT_LENGTHS[modelName as keyof typeof MAX_INPUT_LENGTHS];
}

/**
 * Получает оптимальный размер батча для указанной модели.
 * @param modelName - Название модели
 * @returns Оптимальный размер батча или undefined если модель не поддерживается
 */
export function getOptimalBatchSize(modelName: string): number | undefined {
  return OPTIMAL_BATCH_SIZES[modelName as keyof typeof OPTIMAL_BATCH_SIZES];
}
