/**
 * @module Services
 * @description Индексный файл для экспорта всех сервисов
 * Централизованный экспорт для удобства импорта в других модулях
 */

// Экспорт Ollama API клиента
export { OllamaApi, createOllamaApi } from './ollama-api';

// Экспорт Ollama Manager
export { ollamaManager as OllamaManager } from './ollama-manager';

// Экспорт Model Catalog Service
export {
  ModelCatalogService,
  createModelCatalogService,
} from './model-catalog';

// Экспорт типов
export type {
  OllamaApiConfig,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaModelsResponse,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaDeleteRequest,
  OllamaDeleteResponse,
  OllamaStreamCallback,
  OllamaProgressCallback,
  OllamaOperationResult,
} from '../types/ollama.types';

// Экспорт типов каталога моделей
export type { CatalogFilters } from '../types/catalog.types';

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
} from '../constants/ollama.constants';

// Экспорт утилит
export {
  OllamaErrorHandler,
  withRetry,
  fetchWithErrorHandling,
  createTimeoutController,
  processStreamResponse,
} from '../utils/error-handler';

export { IpcHandler } from '../utils/ipc-handlers';

export type {
  IpcMessage,
  IpcRequest,
  IpcResponse,
} from '../utils/ipc-handlers';
