/**
 * @module FeatureProviderTypeUses
 * Типы для feature-провайдера.
 */

import { Dispatch } from 'redux';

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
  /** Название модели для использования */
  model?: string;
  /** Текст или массив текстов для перевода */
  text: string | string[];
  /** Исходный язык */
  sourceLanguage: string;
  /** Целевой язык */
  targetLanguage: string;
  /** Callback для обработки ответов */
  onModelResponse?: (response: ModelResponse) => void;
  /** Параметры генерации */
  params: UseModelParams;
  /** Дополнительные опции модели */
  options: GenerateOptions;
  /** Сигнал для отмены операции */
  signal?: AbortSignal;
  /** Функция перевода от Lingui */
  t: (template: TemplateStringsArray, ...args: readonly any[]) => string;
  /** Функция для обновления состояния */
  dispatch: Dispatch;
  /** Идентификатор чата для режима чата */
  chatId?: string;
  /** Флаг сохранения истории сообщений в чате */
  saveHistory?: boolean;
}
