/**
 * @module TextNodeManager
 * Утилиты для управления DOM текстовыми узлами.
 * Предоставляет функциональные утилиты для работы с TextInfo массивами при переводе PDF документов.
 * Реализует принципы функционального программирования через чистые функции и композицию.
 */

import createNodeUpdater from '../../hofs/create-node-updater';

/**
 * Создает Map из массива TextInfo для быстрого доступа по индексу.
 * Чистая функция без побочных эффектов, используемая для оптимизации поиска узлов.
 *
 * @param textInfos - Массив информации о текстовых узлах.
 * @returns Map с индексами в качестве ключей и TextInfo в качестве значений.
 *
 * @example
 * // Базовое использование для создания карты узлов
 * const textInfos: TextInfo[] = [
 *   { node: textNode1, original: "Hello", element: divElement1 },
 *   { node: textNode2, original: "World", element: divElement2 }
 * ];
 *
 * const nodeMap = createTextInfoMap(textInfos);
 * // Map(2) { 0 => TextInfo, 1 => TextInfo }
 *
 * @example
 * // Использование в batch обновлении узлов
 * const nodeMap = createTextInfoMap(collectedTextInfos);
 * const nodeUpdater = createNodeUpdater();
 *
 * Object.entries(translations).forEach(([index, text]) => {
 *   const result = nodeUpdater(nodeMap, parseInt(index), text);
 * });
 */
export const createTextInfoMap = (
  textInfos: TextInfo[]
): Map<number, TextInfo> =>
  new Map(textInfos.map((info, index) => [index, info]));

/**
 * Обновляет множество текстовых узлов в batch режиме.
 * Использует композицию функций для безопасного обновления DOM узлов с обработкой ошибок.
 * Возвращает статистику успешных и неудачных обновлений для мониторинга процесса.
 *
 * @param textInfos - Массив информации о текстовых узлах для обновления.
 * @param updates - Объект с индексами узлов и новыми текстами для обновления.
 * @param onError - Опциональный обработчик ошибок, вызывается при неудачном обновлении.
 * @returns Объект со статистикой обновлений (количество успешных и неудачных операций).
 *
 * @example
 * // Базовое batch обновление узлов
 * const textInfos = collectTextNodes(block, range);
 * const updates = { 0: "Привет", 1: "Мир" };
 *
 * const result = updateTextNodes(textInfos, updates);
 * console.log(`Успешно: ${result.successCount}, Ошибок: ${result.errorCount}`);
 *
 * @example
 * // Обновление с обработкой ошибок
 * const result = updateTextNodes(textInfos, updates, (index, error) => {
 *   console.warn(`Не удалось обновить узел ${index}: ${error}`);
 * });
 */
export function updateTextNodes(
  textInfos: TextInfo[],
  updates: Record<number, string>,
  onError?: (index: number, error: string) => void
): { successCount: number; errorCount: number } {
  // Ранний возврат для пустых массивов узлов
  if (textInfos.length === 0) {
    return { successCount: 0, errorCount: 0 };
  }

  // Создание карты узлов для быстрого доступа
  const textInfoMap = createTextInfoMap(textInfos);
  // Создание обновляющего узла с обработкой ошибок
  const nodeUpdater = createNodeUpdater(onError);

  let successCount = 0;
  let errorCount = 0;

  // Итерация по всем обновлениям с подсчетом результатов
  Object.entries(updates).forEach(([idx, text]) => {
    const index = parseInt(idx, 10);
    const result = nodeUpdater(textInfoMap, index, text);

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
  });

  return { successCount, errorCount };
}

/**
 * Создает каррированную функцию-обработчик для обновления узлов с контекстом.
 * Реализует частичное применение для создания специализированного обработчика.
 * Позволяет настраивать логирование ошибок в зависимости от контекста использования.
 *
 * @param textInfos - Массив информации о текстовых узлах.
 * @param shouldLogErrors - Флаг включения логирования ошибок в консоль.
 * @returns Функция-обработчик, принимающая объект обновлений.
 *
 * @example
 * // Создание обработчика с логированием ошибок
 * const updateHandler = createUpdateHandler(textInfos, true);
 * updateHandler({ 0: "Новый текст", 1: "Другой текст" });
 *
 * @example
 * // Использование в PDF переводчике
 * const shouldLogErrors = (status === 'success' || status === 'error') && textInfos.length > 0;
 * const updateHandler = createUpdateHandler(textInfos, shouldLogErrors);
 *
 * updateHandler(generatedResponse as Record<number, string>);
 */
export function createUpdateHandler(
  textInfos: TextInfo[],
  shouldLogErrors: boolean = false
) {
  // Создание обработчика ошибок с условным логированием
  const errorHandler = shouldLogErrors
    ? (index: number, error: string) =>
        console.warn(`⚠️ Node at index ${index} not found in textInfos`)
    : undefined;

  // Возврат каррированной функции с зафиксированным контекстом
  return (updates: Record<number, string>) =>
    updateTextNodes(textInfos, updates, errorHandler);
}

/**
 * Валидирует массив TextInfo на корректность структуры данных.
 * Проверяет наличие всех обязательных полей и корректность типов.
 * Используется для обеспечения целостности данных перед операциями с DOM.
 *
 * @param textInfos - Массив информации о текстовых узлах для валидации.
 * @returns true если все элементы массива корректны, false в противном случае.
 *
 * @example
 * // Валидация перед обновлением узлов
 * if (validateTextInfos(textInfos)) {
 *   const updateHandler = createUpdateHandler(textInfos);
 *   updateHandler(translations);
 * } else {
 *   console.error("Некорректные данные TextInfo");
 * }
 *
 * @example
 * // Проверка целостности данных
 * const isValid = validateTextInfos(collectedTextInfos);
 * if (!isValid) {
 *   throw new Error("Невалидные текстовые узлы");
 * }
 */
export function validateTextInfos(textInfos: TextInfo[]): boolean {
  return textInfos.every(
    (info) =>
      info &&
      info.node &&
      info.node.nodeType === Node.TEXT_NODE &&
      info.element &&
      typeof info.original === 'string'
  );
}

/**
 * Получает статистику по массиву TextInfo узлов.
 * Возвращает информацию о количестве валидных и невалидных узлов.
 * Используется для мониторинга состояния DOM узлов и отладки.
 *
 * @param textInfos - Массив информации о текстовых узлах для анализа.
 * @returns Объект со статистикой узлов (общее количество, валидные, невалидные).
 *
 * @example
 * // Получение статистики узлов
 * const stats = getTextInfoStats(textInfos);
 * console.log(`Всего узлов: ${stats.total}, Валидных: ${stats.valid}, Невалидных: ${stats.invalid}`);
 *
 * @example
 * // Мониторинг состояния перед операциями
 * const stats = getTextInfoStats(collectedTextInfos);
 * if (stats.invalid > 0) {
 *   console.warn(`Обнаружено ${stats.invalid} невалидных узлов`);
 * }
 */
export function getTextInfoStats(textInfos: TextInfo[]): {
  total: number;
  valid: number;
  invalid: number;
} {
  const total = textInfos.length;
  // Подсчет валидных узлов (только текстовые узлы)
  const valid = textInfos.filter(
    (info) => info?.node?.nodeType === Node.TEXT_NODE
  ).length;

  return {
    total,
    valid,
    invalid: total - valid,
  };
}
