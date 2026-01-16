/**
 * @module OllamaConstants
 * Константы для работы с Ollama API.
 * Централизованная конфигурация для всех операций с Ollama.
 */

import { APP_VERSION } from './shared';

/**
 * Базовые настройки для Ollama API.
 * Используются по умолчанию для всех HTTP запросов.
 */
export const OLLAMA_DEFAULT_CONFIG = {
  /** Базовый URL для Ollama API по умолчанию */
  baseUrl: 'http://127.0.0.1:11434',
  /** Количество попыток при ошибках сети */
  retryAttempts: 3,
  /** Задержка между попытками в миллисекундах */
  retryDelay: 1000,
  /** Максимальное время ожидания для streaming ответов */
  streamTimeout: 60000,
} as const;

/**
 * Endpoints Ollama API.
 * Все доступные endpoints для взаимодействия с Ollama.
 */
export const OLLAMA_ENDPOINTS = {
  /** Генерация текста */
  GENERATE: '/api/generate',
  /** Генерация эмбеддингов */
  EMBEDDINGS: '/api/embeddings',
  /** Получение списка моделей */
  LIST_MODELS: '/api/tags',
  /** Установка модели */
  PULL_MODEL: '/api/pull',
  /** Удаление модели */
  DELETE_MODEL: '/api/delete',
  /** Проверка статуса сервера */
  HEALTH: '/api/health',
  /** Информация о модели */
  SHOW_MODEL: '/api/show',
} as const;

/**
 * Заголовки HTTP запросов.
 * Стандартные заголовки для всех запросов к Ollama API.
 */
export const OLLAMA_HEADERS = {
  /** Тип содержимого для JSON */
  CONTENT_TYPE: 'application/json',
  /** Принятие JSON ответов */
  ACCEPT: 'application/json',
  /** User-Agent для идентификации клиента */
  USER_AGENT: `Underlator-Electron/${APP_VERSION}`,
} as const;

/**
 * Параметры по умолчанию для генерации.
 * Базовые настройки для всех операций генерации.
 */
export const OLLAMA_DEFAULT_OPTIONS = {
  /** Температура генерации */
  temperature: 0.7,
  /** Максимальное количество токенов */
  // max_tokens: 2048,
  /** Количество вариантов ответа */
  // num_predict: 1,
  /** Включить режим рассуждения */
  think: false,
} as const;
