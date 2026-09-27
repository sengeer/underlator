/**
 * @module SharedApiIpc
 * Публичный слой BackendClient (FSD-сегмент `ipc`). Транспорты не реэкспортируются.
 */

export type {
  BackendClient,
  CatalogApi,
  ChatApi,
  ModelApi,
} from './types/backend-client';
export { getBackendClient } from './utils/create-backend-client';
export { detectTransport } from './utils/detect-transport';
export { BackendError } from './utils/errors';
export type {
  AddMessageRequest,
  AddMessageResponse,
  CatalogFilters,
  ChatData,
  ChatFile,
  ChatMessage,
  CreateChatRequest,
  DeleteChatRequest,
  DeleteChatResponse,
  GenerateProgress,
  GenerateRequest,
  GetCatalogRequest,
  GetChatRequest,
  GetModelInfoRequest,
  InstallProgress,
  InstallRequest,
  ListChatsRequest,
  ListChatsResponse,
  ListModelsRequest,
  ListModelsResponse,
  ModelCatalog,
  OllamaModelInfo,
  ProviderConfig,
  RemoveRequest,
  UnarySuccess,
  UpdateChatRequest,
} from './types/backend-client';
export type { BackendErrorClass } from './types/errors';
export type { BackendMode } from './types/detect-transport';
export {
  MVP_CATALOG_METHODS,
  MVP_CHAT_METHODS,
  MVP_MODEL_METHODS,
} from './constants/backend-client';
export {
  DEFAULT_PROVIDER_ID,
  DEFAULT_PROVIDER_URL,
} from './constants/http-transport';
export { TAURI_COMMANDS, TAURI_EVENTS } from './constants/tauri-transport';
