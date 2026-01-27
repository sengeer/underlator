/**
 * @module EmbeddingConstants
 * Константы для работы с моделями эмбеддингов на клиенте.
 */

/**
 * Список поддерживаемых моделей эмбеддингов.
 * Используется для фильтрации каталога и валидации выбора в UI.
 */
export const EMBEDDING_MODEL_WHITELIST = [
  'embeddinggemma',
  'qwen3-embedding',
  'nomic-embed-text-v2-moe',
  'nomic-embed-text',
  'mxbai-embed-large',
  'all-minilm',
  'snowflake-arctic-embed',
  'snowflake-arctic-embed2',
  'granite-embedding',
  'bge-large',
  'embed',
] as const;

/**
 * Размерности для поддерживаемых моделей эмбеддингов.
 * Служит подсказкой при валидации и отображении выбранной модели.
 */
export const EMBEDDING_MODEL_DIMENSIONS: Record<string, number> = {
  embeddinggemma: 768,
  'mxbai-embed-large': 1024,
  'all-minilm': 384,
  'bge-small-en': 384,
};

/**
 * Модель RAG по умолчанию.
 */
export const DEFAULT_RAG_MODEL = 'embeddinggemma';

/**
 * Количество результатов по умолчанию для RAG.
 */
export const DEFAULT_RAG_TOP_K = 1;

/**
 * Порог схожести по умолчанию для RAG.
 */
export const DEFAULT_RAG_SIMILARITY_THRESHOLD = 0.3;

/**
 * Размер чанка по умолчанию для RAG.
 */
export const DEFAULT_RAG_CHUNK_SIZE = 2560;

/**
 * Нормализует название модели, удаляя тег после двоеточия.
 *
 * @param modelName - Оригинальное название модели из каталога.
 * @returns Нормализованное название без версии.
 */
export function normalizeEmbeddingModelName(modelName: string): string {
  return modelName?.split(':')[0] || modelName;
}

/**
 * Проверяет, относится ли модель к списку поддерживаемых эмбеддингов.
 *
 * @param modelName - Название модели из каталога.
 * @returns true, если модель входит в whitelists.
 */
export function isEmbeddingModel(modelName: string): boolean {
  const normalizedName = normalizeEmbeddingModelName(modelName);
  return EMBEDDING_MODEL_WHITELIST.includes(
    normalizedName as (typeof EMBEDDING_MODEL_WHITELIST)[number]
  );
}

/**
 * Возвращает размерность векторов для модели эмбеддингов.
 *
 * @param modelName - Название модели.
 * @returns Размерность векторов или undefined, если метаданные неизвестны.
 */
export function getEmbeddingModelDimension(
  modelName: string
): number | undefined {
  return EMBEDDING_MODEL_DIMENSIONS[normalizeEmbeddingModelName(modelName)];
}
