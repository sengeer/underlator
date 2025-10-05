/**
 * @module TranslationLanguagesSliceTypes
 * Типы для TranslationLanguagesSlice.
 * Определяет интерфейсы для управления языками перевода в приложении.
 */

/**
 * Состояние языков перевода.
 * Содержит информацию об исходном и целевом языках для операций перевода.
 * Используется для передачи языковых настроек в LLM модели.
 */
export interface TranslationLanguagesState {
  /** Исходный язык для перевода (например, "english", "russian") */
  sourceLanguage: string;
  /** Целевой язык для перевода (например, "english", "russian") */
  targetLanguage: string;
}
