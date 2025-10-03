/**
 * @module CreateNodeUpdaterTypes
 * Типы для HOF CreateNodeUpdater.
 */

/**
 * Алгебраический тип для результата операции обновления DOM узла.
 * Представляет результат операции обновления текстового узла с возможностью успеха или ошибки.
 * Используется в HOF createNodeUpdater для безопасного обновления DOM узлов при переводе PDF документов.
 *
 * @example
 * // Успешное обновление узла
 * const result: NodeOperationResult = { success: true, updated: true };
 *
 * @example
 * // Ошибка при обновлении узла
 * const result: NodeOperationResult = {
 *   success: false,
 *   error: "Node at index 5 not found in textInfos"
 * };
 */
export type NodeOperationResult =
  | { success: true; updated: boolean }
  | { success: false; error: string };
