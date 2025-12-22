/**
 * @module FeatureHandlersTypes
 * Типы для feature handlers.
 * Определяет интерфейсы для всех handlers обработки переводов и инструкций.
 */

/**
 * Результат подготовки данных для контекстного перевода.
 */
export interface ContextualTranslationPreparationResult {
  /** Успешна ли подготовка */
  success: boolean;
  /** Объединенный текст */
  combinedText?: string;
  /** Промпт для перевода */
  prompt?: string;
  /** Сообщение об ошибке, если подготовка не прошла */
  error?: string;
}
