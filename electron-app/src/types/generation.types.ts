/**
 * @module GenerationTypes
 * @description Типы для работы с генерацией текста
 * Определяет интерфейсы для всех операций генерации
 */

/**
 * @description Параметры генерации
 * Настройки для процесса генерации текста
 */
export interface GenerationParams {
  /** Название модели */
  model: string;
  /** Промпт для генерации */
  prompt: string;
  /** Системный промпт */
  system?: string;
  /** Температура генерации */
  temperature?: number;
  /** Максимальное количество токенов */
  maxTokens?: number;
  /** Количество вариантов */
  numPredict?: number;
  /** Включить режим "думания" */
  think?: boolean;
  /** Дополнительные параметры */
  options?: Record<string, any>;
}

/**
 * @description Режим ответа
 * Определяет формат возвращаемого ответа
 */
export type ResponseMode =
  | 'stringStream'
  | 'arrayStream'
  | 'complete'
  | 'chunks';

/**
 * @description Тип использования модели
 * Определяет назначение использования модели
 */
export type UsageType = 'translation' | 'instruction' | 'completion' | 'chat';

/**
 * @description Направление перевода
 * Определяет языки для перевода
 */
export type TranslationDirection = 'en-ru' | 'ru-en' | 'en-en' | 'ru-ru';

/**
 * @description Параметры контекстного перевода
 * Специальные настройки для контекстного перевода
 */
export interface ContextualTranslationParams {
  /** Использовать контекстный перевод */
  useContextualTranslation: boolean;
  /** Максимальное количество чанков */
  maxChunks?: number;
  /** Размер чанка */
  chunkSize?: number;
  /** Перекрытие между чанками */
  overlap?: number;
  /** Язык перевода */
  translateLanguage: TranslationDirection;
}

/**
 * @description Полные параметры генерации
 * Объединяет все параметры для генерации
 */
export interface FullGenerationParams extends GenerationParams {
  /** Режим ответа */
  responseMode: ResponseMode;
  /** Тип использования */
  typeUse: UsageType;
  /** Параметры контекстного перевода */
  contextualTranslation?: ContextualTranslationParams;
  /** Инструкция для модели */
  instruction?: string;
  /** AbortSignal для отмены */
  signal?: AbortSignal;
}

/**
 * @description Ответ модели
 * Результат генерации от модели
 */
export interface ModelResponse {
  /** Текст ответа */
  text: string;
  /** Индекс для массивов */
  idx?: number;
  /** Временная метка */
  timestamp?: string;
  /** Дополнительные данные */
  metadata?: Record<string, any>;
}

/**
 * @description Прогресс генерации
 * Информация о процессе генерации
 */
export interface GenerationProgress {
  /** Текущий файл */
  file: string;
  /** Прогресс в процентах */
  progress: number;
  /** Текущий токен */
  currentToken?: string;
  /** Общее количество токенов */
  totalTokens?: number;
  /** Время начала */
  startTime?: string;
  /** Оценка времени завершения */
  estimatedTime?: string;
}

/**
 * @description Статус генерации
 * Состояние процесса генерации
 */
export type GenerationStatus =
  | 'idle'
  | 'processing'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'cancelled';

/**
 * @description Результат генерации
 * Финальный результат операции генерации
 */
export interface GenerationResult {
  /** Успешность операции */
  success: boolean;
  /** Сгенерированный текст */
  text: string;
  /** Статус операции */
  status: GenerationStatus;
  /** Ошибка при выполнении */
  error?: string;
  /** Метаданные генерации */
  metadata?: {
    /** Время выполнения */
    duration: number;
    /** Количество токенов */
    tokensUsed: number;
    /** Модель */
    model: string;
    /** Параметры */
    params: GenerationParams;
  };
}

/**
 * @description Callback для обработки ответов
 * Функция для обработки streaming ответов
 */
export type ResponseCallback = (response: ModelResponse) => void;

/**
 * @description Callback для обработки прогресса
 * Функция для обработки прогресса генерации
 */
export type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * @description Callback для обработки ошибок
 * Функция для обработки ошибок генерации
 */
export type ErrorCallback = (error: Error) => void;

/**
 * @description Конфигурация генерации
 * Настройки по умолчанию для генерации
 */
export interface GenerationConfig {
  /** Параметры по умолчанию */
  defaultParams: Partial<GenerationParams>;
  /** Таймаут генерации */
  timeout: number;
  /** Максимальное количество попыток */
  maxRetries: number;
  /** Задержка между попытками */
  retryDelay: number;
  /** Размер буфера для streaming */
  bufferSize: number;
}

/**
 * @description Контекст генерации
 * Дополнительная информация для генерации
 */
export interface GenerationContext {
  /** ID сессии */
  sessionId: string;
  /** ID запроса */
  requestId: string;
  /** Время начала */
  startTime: string;
  /** Пользовательские данные */
  userData?: Record<string, any>;
  /** Метаданные контекста */
  metadata?: Record<string, any>;
}

/**
 * @description Полный контекст генерации
 * Объединяет все параметры и контекст
 */
export interface FullGenerationContext {
  /** Параметры генерации */
  params: FullGenerationParams;
  /** Контекст */
  context: GenerationContext;
  /** Callback для ответов */
  onResponse?: ResponseCallback;
  /** Callback для прогресса */
  onProgress?: ProgressCallback;
  /** Callback для ошибок */
  onError?: ErrorCallback;
}
