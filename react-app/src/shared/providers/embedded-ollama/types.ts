/**
 * @module EmbeddedOllamaTypes
 * @description Типы для embedded-ollama провайдера
 * Определяет интерфейсы для работы с Ollama через Electron IPC
 */

/**
 * @description Интерфейс провайдера Embedded Ollama
 * Реализует ModelUseProvider для работы через Electron IPC
 */
export interface EmbeddedOllamaProvider {
  /**
   * @description Генерирует текст через Ollama API
   * Поддерживает как строки, так и массивы строк
   * Обрабатывает контекстный перевод и инструкции
   */
  generate: (options: GenerateOptions) => Promise<void>;
}

/**
 * @description Опции генерации для Embedded Ollama
 * Расширяет базовые опции специфичными для Ollama параметрами
 */
export interface EmbeddedOllamaGenerateOptions extends GenerateOptions {
  /** Модель Ollama для использования */
  model?: string;
  /** URL сервера Ollama (не используется в embedded режиме) */
  url?: string;
  /** Тип использования: перевод или инструкция */
  typeUse?: 'instruction' | 'translation';
  /** Параметры генерации */
  params: EmbeddedOllamaParams;
}

/**
 * @description Параметры для Embedded Ollama
 * Специфичные параметры для работы с Ollama через Electron IPC
 */
export interface EmbeddedOllamaParams extends Params {
  /** Температура генерации */
  temperature?: number;
  /** Максимальное количество токенов */
  maxTokens?: number;
  /** Использовать контекстный перевод */
  useContextualTranslation?: boolean;
  /** Инструкция для модели */
  instruction?: string;
  /** Режим ответа */
  responseMode: 'arrayStream' | 'stringStream';
}

/**
 * @description Ответ от Ollama через Electron IPC
 * Структура данных, получаемых от IPC
 */
export interface OllamaIpcResponse {
  /** Текст ответа */
  response?: string;
  /** Завершена ли генерация */
  done?: boolean;
  /** Ошибка при генерации */
  error?: string;
  /** Метаданные ответа */
  metadata?: Record<string, any>;
}

/**
 * @description Прогресс установки модели через Electron IPC
 * Информация о процессе загрузки модели
 */
export interface OllamaInstallProgress {
  /** Статус операции */
  status: 'downloading' | 'verifying' | 'writing' | 'complete' | 'error';
  /** Размер загруженных данных */
  size?: number;
  /** Общий размер */
  total?: number;
  /** Название модели */
  name?: string;
  /** Ошибка при установке */
  error?: string;
}

/**
 * @description Конфигурация для Embedded Ollama
 * Настройки по умолчанию для провайдера
 */
export interface EmbeddedOllamaConfig {
  /** Температура по умолчанию */
  defaultTemperature: number;
  /** Максимальное количество токенов по умолчанию */
  defaultMaxTokens: number;
  /** Максимальное количество чанков для контекстного перевода */
  maxChunksPerRequest: number;
  /** Таймаут для IPC операций */
  ipcTimeout: number;
}

/**
 * @description Результат контекстного перевода
 * Маппинг индексов на переведенные тексты
 */
export type ContextualTranslationResult = Record<number, string>;

/**
 * @description Callback для обработки ответов Ollama
 * Функция для обработки streaming ответов через IPC
 */
export type OllamaResponseCallback = (response: OllamaIpcResponse) => void;

/**
 * @description Callback для обработки прогресса установки
 * Функция для обработки прогресса загрузки моделей
 */
export type OllamaProgressCallback = (progress: OllamaInstallProgress) => void;
