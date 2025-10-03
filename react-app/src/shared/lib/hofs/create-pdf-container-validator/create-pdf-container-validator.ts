/**
 * @module CreatePdfContainerValidator
 * HOF CreatePdfContainerValidator для создания предиката валидации для проверки принадлежности выделения к PDF контейнеру.
 */

import { findAncestorWithClass } from '../../utils/pdf-container-validator';

/**
 * Высокоуровневая HOF функция для создания предиката валидации, который проверяет,
 * что выделенный пользователем текст находится внутри указанного PDF контейнера.
 * Используется в системе перевода для обеспечения того, что операции выполняются только
 * с содержимым DOM дерева, а не с произвольным текстом на странице.
 *
 * Функция возвращает каррированную функцию, что позволяет создавать специализированные
 * валидаторы для разных типов контейнеров с предустановленными параметрами.
 *
 * @param {string} [containerClass='pdf-viewer__document'] - CSS класс контейнера PDF документа.
 * @returns {(selection: Selection | null) => boolean} Функция валидации выделения.
 *
 * @example
 * // Создание валидатора для стандартного PDF контейнера
 * const isPdfSelection = createPdfContainerValidator();
 * const isValid = isPdfSelection(window.getSelection());
 *
 * @example
 * // Создание валидатора для кастомного контейнера
 * const isCustomPdfSelection = createPdfContainerValidator('custom-pdf-container');
 * const isValid = isCustomPdfSelection(window.getSelection());
 *
 * @example
 * // Использование в композиции с другими валидаторами
 * const isValidPdfSelection = (selection) =>
 *   hasValidTextSelection(selection) && createPdfContainerValidator()(selection);
 */
export const createPdfContainerValidator =
  (containerClass: string = 'pdf-viewer__document') =>
  (selection: Selection | null): boolean => {
    // Проверка наличия валидного выделения
    // Selection API может вернуть null или пустое выделение
    if (!selection || selection.rangeCount === 0) return false;

    // Получение первого диапазона выделения
    // В большинстве случаев пользователь выделяет непрерывный текст
    const range = selection.getRangeAt(0);

    // Поиск ближайшего предка с указанным классом
    // Это обеспечивает проверку принадлежности к PDF контейнеру
    const ancestor = findAncestorWithClass(
      range.commonAncestorContainer,
      containerClass
    );

    // Возврат результата валидации
    // null означает, что выделение не находится в PDF контейнере
    return ancestor !== null;
  };

export default createPdfContainerValidator;
