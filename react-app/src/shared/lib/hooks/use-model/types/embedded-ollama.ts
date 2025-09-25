/**
 * @module EmbeddedOllamaTypes
 * @description Типы для embedded-ollama провайдера
 * Определяет интерфейсы для работы с Ollama через Electron IPC
 */

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
 * @description Результат контекстного перевода
 * Маппинг индексов на переведенные тексты
 */
export type ContextualTranslationResult = Record<number, string>;

/**
 * @description Параметры для генерации текста через Ollama через Electron IPC
 * Соответствует API endpoint /api/generate
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
  /** Дополнительные параметры модели */
  options?: Record<string, any>;
}

/**
 * @description Ответ от Ollama API при генерации через Electron IPC
 * Структура streaming ответа от /api/generate
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
  [key: string]: any;
}

/**
 * @description Опции генерации для Embedded Ollama
 * Расширяет базовые опции специфичными для Ollama параметрами
 */
export interface GenerateOptions {
  text: string | string[];
  translateLanguage: 'en-ru' | 'ru-en';
  model?: string;
  url?: string;
  typeUse?: 'instruction' | 'translation';
  onModelResponse?: (response: ModelResponse) => void;
  onProgress?: (progress: Progress) => void;
  signal?: AbortSignal;
  params: Params;
}
