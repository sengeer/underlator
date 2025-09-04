/**
 * @module EmbeddedOllamaTypes
 * @description Типы для embedded-ollama провайдера
 * Определяет интерфейсы для работы с Ollama через Electron IPC
 */

import type { ModelUseProvider, GenerateOptions } from '../types';

/**
 * @description Конфигурация embedded-ollama провайдера
 * Настройки для работы с Ollama через Electron IPC
 */
export interface EmbeddedOllamaConfig {
  /** Базовый URL для Ollama API (используется только для fallback) */
  baseUrl?: string;
  /** Таймаут для операций в миллисекундах */
  timeout?: number;
  /** Максимальное количество попыток при ошибках */
  maxRetries?: number;
  /** Задержка между попытками в миллисекундах */
  retryDelay?: number;
}

/**
 * @description Параметры генерации для embedded-ollama
 * Расширяет базовые параметры специфичными для Ollama настройками
 */
export interface EmbeddedOllamaGenerateParams {
  /** Название модели для использования */
  model: string;
  /** Температура генерации (0.0 - 1.0) */
  temperature?: number;
  /** Максимальное количество токенов в ответе */
  maxTokens?: number;
  /** Количество вариантов ответа */
  numPredict?: number;
  /** Включить режим "думания" модели */
  think?: boolean;
  /** Системный промпт для настройки поведения модели */
  system?: string;
  /** Дополнительные параметры модели */
  options?: Record<string, any>;
}

/**
 * @description Опции генерации для embedded-ollama провайдера
 * Объединяет базовые опции с специфичными для Ollama параметрами
 */
export interface EmbeddedOllamaGenerateOptions extends GenerateOptions {
  /** Параметры генерации для Ollama */
  ollamaParams?: EmbeddedOllamaGenerateParams;
  /** Конфигурация провайдера */
  config?: EmbeddedOllamaConfig;
}

/**
 * @description Статусы операций embedded-ollama
 * Отслеживает состояние различных операций с Ollama
 */
export type EmbeddedOllamaStatus =
  | 'idle'
  | 'connecting'
  | 'generating'
  | 'installing'
  | 'removing'
  | 'listing'
  | 'error'
  | 'success';

/**
 * @description Результат операции embedded-ollama
 * Универсальный тип для результатов всех операций
 */
export interface EmbeddedOllamaResult<T = any> {
  /** Успешность операции */
  success: boolean;
  /** Результат операции */
  data?: T;
  /** Ошибка при выполнении */
  error?: string;
  /** Статус операции */
  status: EmbeddedOllamaStatus;
}

/**
 * @description Callback для обработки прогресса генерации
 * Используется для отслеживания процесса генерации текста
 */
export type EmbeddedOllamaProgressCallback = (progress: {
  /** Текущий токен */
  token?: string;
  /** Прогресс в процентах */
  progress?: number;
  /** Общее количество токенов */
  totalTokens?: number;
  /** Время начала */
  startTime?: string;
  /** Оценка времени завершения */
  estimatedTime?: string;
}) => void;

/**
 * @description Callback для обработки ошибок
 * Используется для централизованной обработки ошибок
 */
export type EmbeddedOllamaErrorCallback = (
  error: Error,
  context?: string
) => void;

/**
 * @description Интерфейс embedded-ollama провайдера
 * Расширяет базовый ModelUseProvider специфичными для Ollama методами
 */
export interface EmbeddedOllamaProvider extends ModelUseProvider {
  /** Инициализация провайдера */
  initialize?: (config?: EmbeddedOllamaConfig) => Promise<void>;
  /** Генерация текста через Ollama */
  generate: (options: EmbeddedOllamaGenerateOptions) => Promise<void>;
  /** Отмена текущей операции */
  abort?: () => void;
  /** Получение списка доступных моделей */
  listModels?: () => Promise<EmbeddedOllamaResult<any>>;
  /** Установка модели */
  installModel?: (modelName: string) => Promise<EmbeddedOllamaResult<void>>;
  /** Удаление модели */
  removeModel?: (modelName: string) => Promise<EmbeddedOllamaResult<void>>;
  /** Проверка статуса Ollama сервера */
  healthCheck?: () => Promise<EmbeddedOllamaResult<boolean>>;
}
