/**
 * @module SharedApi
 * Публичный слой BackendClient. Транспорты не реэкспортируются.
 */

export type {
  BackendClient,
  CatalogApi,
  ChatApi,
  ModelApi,
} from './backend-client';
export { getBackendClient } from './create-backend-client';
export { detectTransport } from './detect-transport';
export { BackendError } from './errors';
export type {
  AddMessageRequest,
  AddMessageResponse,
  BackendErrorClass,
  BackendMode,
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
  ListModelsResponse,
  ModelCatalog,
  OllamaModelInfo,
  ProviderConfig,
  RemoveRequest,
  UnarySuccess,
  UpdateChatRequest,
} from './types';
export {
  DEFAULT_PROVIDER_ID,
  DEFAULT_PROVIDER_URL,
  MVP_CATALOG_METHODS,
  MVP_CHAT_METHODS,
  MVP_MODEL_METHODS,
  TAURI_COMMANDS,
  TAURI_EVENTS,
} from './types';
