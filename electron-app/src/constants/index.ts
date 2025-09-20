/**
 * @module Constants
 * @description Индексный файл для экспорта всех констант
 */

// Экспорт констант Ollama
export {
  OLLAMA_DEFAULT_CONFIG,
  OLLAMA_ENDPOINTS,
  OLLAMA_HTTP_STATUS,
  OLLAMA_ERROR_TYPES,
  OLLAMA_MODEL_STATUS,
  OLLAMA_HEADERS,
  OLLAMA_DEFAULT_GENERATION_PARAMS,
  OLLAMA_ERROR_MESSAGES,
  OLLAMA_RETRY_CONFIG,
} from './ollama.constants';

// Экспорт констант каталога моделей
export { STATIC_MODELS, DEFAULT_CATALOG_CONFIG } from './catalog.constants';

// Экспорт констант splash screen (React архитектура)
export { SPLASH_TIMING, SPLASH_IPC_EVENTS } from './splash.constants';
