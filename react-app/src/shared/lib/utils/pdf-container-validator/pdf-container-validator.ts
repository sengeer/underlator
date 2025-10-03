/**
 * @module PdfContainerValidator
 * Утилиты для валидации PDF контейнеров и выделения текста.
 * Предоставляет функции для проверки принадлежности выделения к PDF документам.
 * Используется в системе перевода для обеспечения работы только с PDF контентом.
 */

import createPdfContainerValidator from '../../hofs/create-pdf-container-validator';

/**
 * Проверяет наличие CSS класса у элемента.
 * Чистая функция для валидации DOM элементов.
 *
 * @param element - DOM элемент для проверки.
 * @param className - CSS класс для поиска.
 * @returns true если элемент содержит указанный класс.
 */
const hasClass = (element: Element, className: string): boolean =>
  element.classList.contains(className);

/**
 * Находит ближайшего предка с указанным CSS классом.
 * Выполняет обход DOM дерева вверх от указанного узла.
 * Ограничивает глубину поиска для предотвращения бесконечных циклов.
 *
 * @param node - Начальный узел для поиска.
 * @param className - CSS класс для поиска.
 * @param maxDepth - Максимальная глубина поиска (по умолчанию 10).
 * @returns Найденный элемент или null если не найден.
 */
export function findAncestorWithClass(
  node: Node | null,
  className: string,
  maxDepth: number = 10
): Element | null {
  let currentNode = node;
  let depth = 0;

  while (currentNode && depth < maxDepth) {
    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const element = currentNode as Element;
      if (hasClass(element, className)) {
        return element;
      }
    }
    currentNode = currentNode.parentNode;
    depth++;
  }

  return null;
}

/**
 * Валидатор для проверки принадлежности выделения к PDF контенту.
 * Использует стандартный класс PDF контейнера 'pdf-viewer__document'.
 * Создается через HOF для обеспечения единообразной валидации.
 */
export const isPdfContentSelection = createPdfContainerValidator();

/**
 * Проверяет валидность выделения текста.
 * Валидирует наличие непустого текста в выделении.
 * Используется как предварительная проверка перед валидацией контейнера.
 *
 * @param selection - Объект выделения для проверки.
 * @returns true если выделение содержит валидный текст.
 */
export function hasValidTextSelection(selection: Selection | null): boolean {
  if (!selection) return false;

  const text = selection.toString().trim();
  return text.length > 0;
}

/**
 * Композитная функция валидации PDF выделения.
 * Объединяет проверку валидности текста и принадлежности к PDF контейнеру.
 * Используется в системе перевода для обеспечения работы только с PDF контентом.
 *
 * @param selection - Объект выделения для валидации.
 * @returns true если выделение валидно и принадлежит PDF контейнеру.
 */
export const isValidPdfSelection = (selection: Selection | null): boolean =>
  hasValidTextSelection(selection) && isPdfContentSelection(selection);
