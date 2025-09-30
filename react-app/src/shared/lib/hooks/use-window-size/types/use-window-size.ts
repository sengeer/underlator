/**
 * @module UseWindowSizeTypes
 * Типы для хука useWindowSize.
 */

/**
 * Объект с размерами окна браузера.
 * Содержит актуальные значения ширины и высоты в пикселях.
 */
export interface WindowSize {
  /** Ширина окна браузера в пикселях */
  width: number;
  /** Высота окна браузера в пикселях */
  height: number;
}
