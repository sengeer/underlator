/**
 * @module OllamaConstants
 * Константы для работы с Ollama API.
 * Централизованная конфигурация для всех операций с Ollama.
 */

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
 * Endpoints Ollama API
 * Все доступные endpoints для взаимодействия с Ollama
 */
export const OLLAMA_ENDPOINTS = {
  /** Генерация текста */
  GENERATE: '/api/generate',
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
 * HTTP статус коды для обработки ошибок.
 * Используются для определения типа ошибки.
 */
export const OLLAMA_HTTP_STATUS = {
  /** Успешный запрос */
  OK: 200,
  /** Создан ресурс */
  CREATED: 201,
  /** Нет содержимого */
  NO_CONTENT: 204,
  /** Неверный запрос */
  BAD_REQUEST: 400,
  /** Не авторизован */
  UNAUTHORIZED: 401,
  /** Запрещено */
  FORBIDDEN: 403,
  /** Не найдено */
  NOT_FOUND: 404,
  /** Конфликт */
  CONFLICT: 409,
  /** Внутренняя ошибка сервера */
  INTERNAL_ERROR: 500,
  /** Сервис недоступен */
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Типы ошибок Ollama.
 * Категории ошибок для централизованной обработки.
 */
export const OLLAMA_ERROR_TYPES = {
  /** Ошибка сети */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Ошибка API */
  API_ERROR: 'API_ERROR',
  /** Ошибка модели */
  MODEL_ERROR: 'MODEL_ERROR',
  /** Ошибка таймаута */
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  /** Ошибка валидации */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Неизвестная ошибка */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
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
  USER_AGENT: 'Underlator-Electron/1.0.0',
} as const;

/**
 * Параметры по умолчанию для генерации.
 * Базовые настройки для всех операций генерации.
 */
export const OLLAMA_DEFAULT_GENERATION_PARAMS = {
  /** Температура генерации */
  temperature: 0.7,
  /** Максимальное количество токенов */
  max_tokens: 2048,
  /** Количество вариантов ответа */
  num_predict: 1,
  /** Включить режим рассуждения */
  think: true,
} as const;

/**
 * Сообщения об ошибках.
 * Стандартизированные сообщения для различных типов ошибок.
 */
export const OLLAMA_ERROR_MESSAGES = {
  /** Сервер недоступен */
  SERVER_UNAVAILABLE:
    '❌ The Ollama server is unavailable. Check that Ollama is running.',
  /** Модель не найдена */
  MODEL_NOT_FOUND: '❌ The model was not found. Check the model name.',
  /** Недостаточно места */
  INSUFFICIENT_SPACE: '❌ There is not enough disk space to install the model.',
  /** Ошибка сети */
  NETWORK_ERROR: '❌ Network error when connecting to the Ollama server.',
  /** Таймаут операции */
  TIMEOUT_ERROR: '❌ The operation exceeded the waiting time.',
  /** Неверные параметры */
  INVALID_PARAMS: '❌ Invalid request parameters.',
  /** Неизвестная ошибка */
  UNKNOWN_ERROR: '❌ An unknown error has occurred.',
} as const;

/**
 * Настройки для retry логики.
 * Параметры для повторных попыток при ошибках.
 */
export const OLLAMA_RETRY_CONFIG = {
  /** Максимальное количество попыток */
  MAX_ATTEMPTS: 3,
  /** Базовая задержка между попытками */
  BASE_DELAY: 1000,
  /** Максимальная задержка */
  MAX_DELAY: 5000,
  /** Множитель задержки */
  BACKOFF_MULTIPLIER: 2,
  /** Статус коды для retry */
  RETRY_STATUS_CODES: [
    OLLAMA_HTTP_STATUS.INTERNAL_ERROR,
    OLLAMA_HTTP_STATUS.SERVICE_UNAVAILABLE,
    OLLAMA_HTTP_STATUS.BAD_REQUEST,
  ],
} as const;
