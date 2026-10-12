/**
 * @module UseProgressiveRevealTypes
 * Типы хука порционного раскрытия списка.
 */

/**
 * Когда монтировать первую порцию.
 * `transitionend` — после анимации открытия, `frame` — на следующем кадре.
 */
export type ProgressiveRevealDefer = 'transitionend' | 'frame';

/**
 * Вход хука useProgressiveReveal.
 */
export interface UseProgressiveRevealOptions<T> {
  /** Список, который раскрывается префиксом. */
  items: readonly T[];
  /** Пора раскрывать список. Пока false, префикс пуст. */
  open: boolean;
  /** Размер порции. По умолчанию 20. */
  chunkSize?: number;
  /**
   * Сколько элементов показать в первом кадре, до отложенных порций.
   * 0 — первый кадр пуст, первая порция приходит по `defer`.
   */
  initialCount?: number;
  /** Ключ элемента. Нужен, чтобы смена состава объектов сбрасывала префикс. */
  getItemKey?: (item: T, index: number) => string;
  /**
   * Когда задан, префикс сбрасывается только при смене этого ключа.
   * Рост того же списка не обнуляет уже раскрытые элементы.
   */
  resetKey?: string;
  /** Когда монтировать первую порцию. */
  defer?: ProgressiveRevealDefer;
  /** Корень, на котором слушаем transitionend. */
  targetRef?: { readonly current: HTMLElement | null };
  /** Запасной таймер, если transitionend не пришёл. По умолчанию 280 мс. */
  fallbackMs?: number;
}

/**
 * Выход хука useProgressiveReveal.
 */
export interface UseProgressiveRevealResult<T> {
  /** Уже раскрытый префикс. Пуст при закрытии и сразу после смены списка. */
  prefix: readonly T[];
  /** Оболочка может рисоваться, пока префикс ещё пуст. */
  shellReady: boolean;
}
