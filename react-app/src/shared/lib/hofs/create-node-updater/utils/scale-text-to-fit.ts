/**
 * @module ScaleTextToFit
 * Утилита для масштабирования текста с сохранением размеров DOM элемента.
 * Реализует алгоритм адаптивного масштабирования шрифта для предотвращения
 * выхода текста за границы элемента при замене оригинального текста переводом.
 */

/**
 * Масштабирует размер шрифта элемента так, чтобы текст помещался в оригинальные размеры.
 * Использует прямое вычисление коэффициента масштабирования на основе соотношения размеров.
 * Сложность: O(1) - константное время выполнения.
 *
 * @param element - HTML элемент, содержащий текст для масштабирования.
 * @param originalWidth - Оригинальная ширина элемента в пикселях.
 * @param originalHeight - Оригинальная высота элемента в пикселях.
 * @param originalFontSize - Оригинальный размер шрифта в пикселях.
 * @returns Новый размер шрифта, при котором текст помещается в оригинальные размеры.
 *
 * @example
 * // Базовое использование для масштабирования текста
 * const element = document.querySelector('.text-element');
 * const originalWidth = element.offsetWidth;
 * const originalHeight = element.offsetHeight;
 * const originalFontSize = parseFloat(getComputedStyle(element).fontSize);
 *
 * // После замены текста
 * element.textContent = "Новый длинный текст";
 * const newFontSize = scaleTextToFit(element, originalWidth, originalHeight, originalFontSize);
 * element.style.fontSize = `${newFontSize}px`;
 */
export function scaleTextToFit(
  element: HTMLElement,
  originalWidth: number,
  originalHeight: number,
  originalFontSize: number
): number {
  // Ранний возврат для некорректных данных
  if (originalWidth <= 0 || originalHeight <= 0 || originalFontSize <= 0) {
    return originalFontSize;
  }

  // Получение текущих размеров элемента (обращение к offsetWidth/offsetHeight
  // автоматически триггерит пересчет layout браузером)
  const currentWidth = element.offsetWidth;
  const currentHeight = element.offsetHeight;

  // Если текст уже помещается, возвращаем оригинальный размер
  if (currentWidth <= originalWidth && currentHeight <= originalHeight) {
    return originalFontSize;
  }

  // Вычисление коэффициентов масштабирования для ширины и высоты
  const widthScale = originalWidth / currentWidth;
  const heightScale = originalHeight / currentHeight;

  // Используем минимальный коэффициент для гарантии помещаемости в оба измерения
  const scaleFactor = Math.min(widthScale, heightScale);

  // Применяем коэффициент к размеру шрифта с небольшим запасом (0.95) для надежности
  const scaledFontSize = originalFontSize * scaleFactor * 0.95;

  // Ограничиваем минимальный размер шрифта (не менее 50% от оригинала)
  return Math.max(scaledFontSize, originalFontSize * 0.5);
}

/**
 * Получает оригинальные размеры и размер шрифта элемента.
 * Используется для сохранения метрик перед заменой текста.
 *
 * @param element - HTML элемент для измерения.
 * @returns Объект с оригинальными размерами и размером шрифта.
 *
 * @example
 * // Сохранение метрик перед заменой текста
 * const metrics = getElementMetrics(element);
 * element.textContent = "Новый текст";
 * const newFontSize = scaleTextToFit(
 *   element,
 *   metrics.width,
 *   metrics.height,
 *   metrics.fontSize
 * );
 * element.style.fontSize = `${newFontSize}px`;
 */
export function getElementMetrics(element: HTMLElement): {
  width: number;
  height: number;
  fontSize: number;
} {
  const computedStyle = getComputedStyle(element);
  const fontSize = parseFloat(computedStyle.fontSize) || 16;

  return {
    width: element.offsetWidth,
    height: element.offsetHeight,
    fontSize,
  };
}
