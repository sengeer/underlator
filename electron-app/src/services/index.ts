/**
 * @module Services
 * @description Индексный файл для экспорта всех сервисов
 * Централизованный экспорт для удобства импорта в других модулях
 */

// Экспорт Ollama API клиента
export { OllamaApi, createOllamaApi } from './ollama-api';

// Экспорт Ollama Manager
export { ollamaManager as OllamaManager } from './ollama-manager';

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

// Экспорт констант
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

export {
  IpcHandler,
  generateMessageId,
  isMessageType,
  extractRequestParams,
  createStandardIpcHandler,
  createStreamingIpcHandler,
} from '../utils/ipc-handlers';

export type {
  IpcMessage,
  IpcRequest,
  IpcResponse,
} from '../utils/ipc-handlers';
