/**
 * @module ChunkTextManagerIndex
 * Индексный файл для экспорта утилит управления текстовыми фрагментами.
 * Предоставляет функции для работы с фрагментами в контекстном переводе.
 */

export {
  combineChunks,
  splitCombinedText,
  convertArrayToRecord,
  prepareContextualTranslation,
  processContextualResponse,
} from './chunk-text-manager';

export { ChunkOperationResult } from './types/chunk-text-manager';
