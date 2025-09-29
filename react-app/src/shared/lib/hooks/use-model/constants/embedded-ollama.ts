/**
 * @module EmbeddedOllamaConstants
 * Константы для работы с Embedded Ollama.
 */

/**
 * Конфигурация по умолчанию для Embedded Ollama.
 * Настройки для оптимальной работы с Electron IPC.
 */
export const DEFAULT_CONFIG = {
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  maxChunksPerRequest: 50,
  ipcTimeout: 30000,
};
