/**
 * @module ProviderTypes
 * Типы для провайдера.
 * Определяет интерфейсы для работы с LLM моделью через Electron IPC.
 */

/**
 * Ответ от LLM модели через Electron IPC.
 * Структура данных, получаемых от IPC.
 */
export interface IpcResponse {
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
 * Результат контекстного перевода.
 * Маппинг индексов на переведенные тексты.
 */
export type ContextualTranslationResult = Record<number, string>;

/**
 * Контекст запроса к модели.
 * Содержит всю необходимую информацию для выполнения запроса к LLM модели.
 */
export interface ModelRequestContext {
  /** Конфигурация для API */
  config: {
    /** Идентификатор провайдера */
    id: string;
    /** URL провайдера */
    url: string;
  };
  /** Название модели для использования. */
  model?: string;
  /** Тип использования модели */
  typeUse?: 'instruction' | 'translation';
  /** Текст или массив текстов для перевода. */
  text: string | string[];
  /** Язык перевода */
  translateLanguage: 'en-ru' | 'ru-en';
  /** Callback для обработки ответов. */
  onModelResponse?: (response: ModelResponse) => void;
  /** Параметры генерации. */
  params: UseModelParams;
  /** Дополнительные опции модели */
  options: GenerateOptions;
  /** Сигнал для отмены операции. */
  signal?: AbortSignal;
}
