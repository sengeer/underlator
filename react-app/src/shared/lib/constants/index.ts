/**
 * @module ConstantsIndex
 * Индексный файл для экспорта всех констант.
 */

export {
  DEFAULT_MODEL,
  DEFAULT_URL,
  DEFAULT_OPTIONS,
  CHUNK_DELIMITER,
  DEFAULT_LOCALE,
} from './shared';

export {
  EMBEDDING_MODEL_WHITELIST,
  EMBEDDING_MODEL_DIMENSIONS,
  normalizeEmbeddingModelName,
  isEmbeddingModel,
  getEmbeddingModelDimension,
  DEFAULT_RAG_MODEL,
  DEFAULT_RAG_TOP_K,
  DEFAULT_RAG_SIMILARITY_THRESHOLD,
  DEFAULT_RAG_CHUNK_SIZE,
} from './embedding';
