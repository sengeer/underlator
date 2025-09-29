/**
 * @module UseFormAndValidationTypes
 * Типы для хука useFormAndValidation.
 */

/**
 * Интерфейс для хранения значений полей формы.
 * Используется для типизации состояния значений в хуке useFormAndValidation.
 */
export interface Values {
  /** Значения полей формы в формате ключ-значение */
  [key: string]: string;
}
