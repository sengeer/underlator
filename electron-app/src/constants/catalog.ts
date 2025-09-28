/**
 * @module CatalogConstants
 * Константы для работы с каталогом моделей Ollama.
 * Централизованная конфигурация для всех операций с каталогом моделей Ollama.
 */

import type { ModelCatalogConfig } from '../types';

/**
 * Статический запасной список моделей Ollama.
 * Список моделей, которые можно установить через ollama pull.
 */
export const STATIC_MODELS = [
  {
    id: 'library-qwen3-3',
    name: 'qwen3',
    displayName: 'qwen3',
    description: 'Модель qwen3 из Ollama Library',
    version: 'latest',
    size: 600000000,
    createdAt: '2025-09-05T14:12:26.798Z',
    modifiedAt: '2025-09-05T14:12:26.798Z',
    type: 'ollama',
    format: 'gguf',
    parameterSize: 'Unknown',
    quantizationLevel: 'Unknown',
    tags: ['available'],
  },
];

/**
 * Конфигурация по умолчанию для ModelCatalog.
 * Базовые настройки для работы с локальным Ollama API.
 */
export const DEFAULT_CATALOG_CONFIG: ModelCatalogConfig = {
  /** Локальный Ollama API */
  ollamaUrl: 'http://127.0.0.1:11434',
  /** Таймаут 30 секунд для получения каталога */
  timeout: 30000,
  /** Кэш на 1 час для оптимизации */
  cacheTimeout: 60 * 60 * 1000,
  /** Максимум 3 попытки при ошибках */
  maxRetries: 3,
  /** Задержка 1 секунда между попытками */
  retryDelay: 1000,
};
