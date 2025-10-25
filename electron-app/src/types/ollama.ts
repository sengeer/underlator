/**
 * @module OllamaTypes
 * Типы для работы с Ollama API.
 * Определяет интерфейсы для всех операций с Ollama HTTP API.
 */

/**
 * Параметры для генерации текста через Ollama.
 * Соответствует API endpoint /api/generate.
 */
export interface OllamaGenerateRequest {
  /** Название модели для использования */
  model: string;
  /** Текст для обработки моделью */
  prompt: string;
  /** Системный промпт для настройки поведения модели */
  system?: string;
  /** Температура генерации (0.0 - 1.0) */
  temperature?: number;
  /** Максимальное количество токенов в ответе */
  max_tokens?: number;
  /** Количество вариантов ответа */
  num_predict?: number;
  /** Включить режим "думания" модели */
  think?: boolean;
  /** Параметры для управления контекстом */
  context?: number[];
}

/**
 * Ответ от Ollama API при генерации.
 * Структура streaming ответа от /api/generate.
 */
export interface OllamaGenerateResponse {
  /** Название использованной модели */
  model: string;
  /** Созданный текст */
  response: string;
  /** Временная метка создания */
  created_at: string;
  /** Завершена ли генерация */
  done: boolean;
  /** Общее количество токенов в ответе */
  total_duration?: number;
  /** Время загрузки модели */
  load_duration?: number;
  /** Время генерации токенов */
  prompt_eval_duration?: number;
  /** Время оценки промпта */
  eval_duration?: number;
  /** Количество токенов в промпте */
  prompt_eval_count?: number;
  /** Количество сгенерированных токенов */
  eval_count?: number;
  /** Контекст для продолжения генерации */
  context?: number[];
  /** Дополнительные данные от модели */
  [key: string]: unknown;
}

/**
 * Информация о модели в Ollama.
 * Структура ответа от /api/tags.
 */
export interface OllamaModel {
  /** Название модели */
  name: string;
  /** Размер модели в байтах */
  size: number;
  /** Дата последнего изменения */
  modified_at: string;
  /** Дополнительные метаданные */
  digest?: string;
  /** Детали модели */
  details?: {
    /** Формат модели */
    format: string;
    /** Параметры модели */
    parameter_size: string;
    /** Размер контекста */
    quantization_level: string;
  };
}

/**
 * Список доступных моделей.
 * Ответ от /api/tags.
 */
export interface OllamaModelsResponse {
  /** Массив доступных моделей */
  models: OllamaModel[];
}

/**
 * Параметры для установки модели.
 * Структура запроса для /api/pull.
 */
export interface OllamaPullRequest {
  /** Название модели для установки */
  name: string;
  /** Необязательный тег модели */
  tag?: string;
  /** Необязательный реестр для загрузки */
  registry?: string;
  /** Включить insecure registry */
  insecure?: boolean;
}

/**
 * Прогресс установки модели.
 * Streaming ответ от /api/pull.
 */
export interface OllamaPullProgress {
  /** Статус операции */
  status: 'downloading' | 'verifying' | 'writing' | 'complete';
  /** Название модели */
  name: string;
  /** Размер загруженных данных */
  size?: number;
  /** Общий размер модели */
  total?: number;
  /** Дополнительная информация */
  digest?: string;
  /** Ошибка при установке */
  error?: string;
}

/**
 * Параметры для удаления модели.
 * Структура запроса для /api/delete.
 */
export interface OllamaDeleteRequest {
  /** Название модели для удаления */
  name: string;
}

/**
 * Результат удаления модели.
 * Ответ от /api/delete.
 */
export interface OllamaDeleteResponse {
  /** Успешность операции */
  success: boolean;
  /** Сообщение о результате */
  message?: string;
}

/**
 * Конфигурация HTTP клиента.
 * Настройки для OllamaApi класса.
 */
export interface OllamaApiConfig {
  /** Базовый URL для Ollama API */
  baseUrl: string;
  /** Таймаут для HTTP запросов в миллисекундах */
  timeout: number;
  /** Количество попыток при ошибках */
  retryAttempts: number;
  /** Задержка между попытками в миллисекундах */
  retryDelay: number;
}

/**
 * Callback для обработки streaming ответов.
 * Используется для обработки прогресса генерации.
 */
export type OllamaStreamCallback = (chunk: OllamaGenerateResponse) => void;

/**
 * Callback для обработки прогресса установки.
 * Используется для отслеживания загрузки моделей.
 */
export type OllamaProgressCallback = (progress: OllamaPullProgress) => void;

/**
 * Статусы операций с Ollama.
 * Используется для отслеживания состояния операций.
 */
export type OllamaOperationStatus =
  | 'idle'
  | 'connecting'
  | 'generating'
  | 'installing'
  | 'removing'
  | 'listing'
  | 'error'
  | 'success';

/**
 * Параметры для генерации эмбеддингов через Ollama.
 * Соответствует API endpoint /api/embeddings.
 */
export interface OllamaEmbeddingRequest {
  /** Название модели эмбеддингов для использования */
  model: string;
  /** Текст для векторизации */
  prompt: string;
  /** Дополнительные параметры генерации */
  options?: {
    /** Температура генерации (0.0 - 1.0) */
    temperature?: number;
    /** Максимальное количество токенов */
    max_tokens?: number;
    /** Использовать GPU для вычислений */
    use_gpu?: boolean;
    /** Количество потоков для обработки */
    num_threads?: number;
  };
}

/**
 * Ответ от Ollama API при генерации эмбеддингов.
 * Структура ответа от /api/embeddings.
 */
export interface OllamaEmbeddingResponse {
  /** Название использованной модели */
  model: string;
  /** Массив эмбеддингов (векторов) */
  embedding: number[];
  /** Размерность векторов */
  dimensions?: number;
  /** Временная метка создания */
  created_at: string;
  /** Время генерации эмбеддинга в миллисекундах */
  total_duration?: number;
  /** Время загрузки модели */
  load_duration?: number;
  /** Время генерации эмбеддинга */
  prompt_eval_duration?: number;
  /** Количество токенов в промпте */
  prompt_eval_count?: number;
  /** Метаданные модели */
  metadata?: {
    /** Формат модели */
    format?: string;
    /** Размер параметров модели */
    parameter_size?: string;
    /** Уровень квантизации */
    quantization_level?: string;
  };
}

/**
 * Конфигурация для сервиса эмбеддингов.
 * Настройки для различных моделей эмбеддингов.
 */
export interface OllamaEmbeddingConfig {
  /** Основная модель эмбеддингов по умолчанию */
  defaultModel: string;
  /** Альтернативные модели эмбеддингов */
  fallbackModels: string[];
  /** Настройки для различных моделей */
  modelSettings: Record<
    string,
    {
      /** Размерность векторов модели */
      dimensions: number;
      /** Максимальная длина входного текста */
      maxInputLength: number;
      /** Оптимальный размер батча */
      optimalBatchSize: number;
      /** Поддерживает ли модель батчевую обработку */
      supportsBatchProcessing: boolean;
    }
  >;
  /** Настройки кэширования */
  cacheSettings: {
    /** Включить кэширование эмбеддингов */
    enabled: boolean;
    /** Время жизни кэша в миллисекундах */
    ttl: number;
    /** Максимальный размер кэша в байтах */
    maxSize: number;
  };
  /** Настройки производительности */
  performanceSettings: {
    /** Максимальное количество одновременных запросов */
    maxConcurrentRequests: number;
    /** Таймаут для запросов эмбеддингов */
    requestTimeout: number;
    /** Задержка между батчевыми запросами */
    batchDelay: number;
  };
}

/**
 * Результат операции с Ollama.
 * Универсальный тип для результатов всех операций.
 */
export interface OllamaOperationResult<T = unknown> {
  /** Успешность операции */
  success: boolean;
  /** Результат операции */
  data?: T;
  /** Ошибка при выполнении */
  error?: string;
  /** Статус операции */
  status: OllamaOperationStatus;
}
