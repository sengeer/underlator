/**
 * @module SplittingContentOfModelTypes
 * Типы для SplittingContentOfModel.
 * Определяет интерфейсы для результатов разделения контента модели.
 */

/**
 * Результат разделения контента модели.
 * Содержит массивы с извлеченными частями контента.
 */
export interface SplittingResult {
  /** Массив с содержимым тегов <think> (размышления модели) */
  thinkingParts: string[];
  /** Массив с основным контентом без тегов <think> */
  mainContentParts: string[];
}
