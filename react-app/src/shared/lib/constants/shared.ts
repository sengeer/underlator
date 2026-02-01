/**
 * @module SharedConstants
 * Общие константы приложения.
 */

/**
 * Модель по умолчанию.
 */
export const DEFAULT_MODEL = 'qwen3:4b';

/**
 * URL по умолчанию.
 */
export const DEFAULT_URL = 'http://127.0.0.1:11434';

/**
 * Дополнительные опции для оптимальной работы с Electron IPC.
 */
export const DEFAULT_OPTIONS = {
  temperature: 0.7,
  max_tokens: 200,
  num_predict: 1,
  think: true,
};

/**
 * Delimiter для разделения чанков контекстного перевода.
 */
export const CHUNK_DELIMITER = '🔴';

/**
 * Локализация приложения по умолчанию.
 */
export const DEFAULT_LOCALE = 'en';
