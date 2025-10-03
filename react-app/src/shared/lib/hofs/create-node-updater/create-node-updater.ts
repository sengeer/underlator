/**
 * @module CreateNodeUpdater
 * HOF CreateNodeUpdater для создания обновляющего узла с обработкой ошибок.
 */

import type { NodeOperationResult } from './types/create-node-updater';

/**
 * Высокоуровневая HOF функция для безопасного обновления DOM узлов.
 * Реализует функциональный подход к обновлению DOM узлов с обработкой ошибок и валидацией.
 * Используется в системе перевода DOM дерева для обновления текстовых узлов переведенным контентом.
 *
 * @param onError - Опциональный обработчик ошибок, вызывается при неудачном обновлении узла.
 * @returns Функция обновления узла, принимающая карту узлов, индекс и новый текст.
 *
 * @example
 * // Базовое использование с обработкой ошибок
 * const nodeUpdater = createNodeUpdater((index, error) => {
 *   console.warn(`Ошибка обновления узла ${index}: ${error}`);
 * });
 *
 * const result = nodeUpdater(textInfoMap, 0, "Новый текст");
 * if (result.success) {
 *   console.log("Узел успешно обновлен");
 * }
 *
 * @example
 * // Использование в batch обновлении через text-node-manager
 * const nodeUpdater = createNodeUpdater();
 * const textInfoMap = new Map([[0, textInfo]]);
 *
 * Object.entries(translations).forEach(([index, text]) => {
 *   const result = nodeUpdater(textInfoMap, parseInt(index), text);
 *   if (!result.success) {
 *     console.error(`Не удалось обновить узел ${index}: ${result.error}`);
 *   }
 * });
 */
export const createNodeUpdater =
  (onError?: (index: number, error: string) => void) =>
  (
    textInfoMap: Map<number, TextInfo>,
    index: number,
    newText: string
  ): NodeOperationResult => {
    // Получение информации о текстовом узле по индексу
    const textInfo = textInfoMap.get(index);

    // Валидация существования записи в карте узлов
    if (!textInfo) {
      const error = `Node at index ${index} not found in textInfos.`;
      if (onError) onError(index, error);
      return { success: false, error };
    }

    // Валидация существования DOM узла (защита от null/undefined)
    if (!textInfo.node) {
      const error = `Text node at index ${index} is null or undefined.`;
      if (onError) onError(index, error);
      return { success: false, error };
    }

    try {
      // Безопасное обновление значения текстового узла
      textInfo.node.nodeValue = newText;
      return { success: true, updated: true };
    } catch (error) {
      // Обработка исключений при обновлении DOM узла
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      if (onError) onError(index, errorMessage);
      return { success: false, error: errorMessage };
    }
  };

export default createNodeUpdater;
