/**
 * @module TextNodeManagerIndex
 * Индексный файл для экспорта утилит управления DOM текстовыми узлами.
 * Предоставляет функциональные утилиты для работы с TextInfo массивами при переводе PDF документов.
 */

export {
  createTextInfoMap,
  updateTextNodes,
  createUpdateHandler,
  validateTextInfos,
  getTextInfoStats,
} from './text-node-manager';
