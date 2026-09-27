/**
 * @module BackendClient
 * Публичный контракт MVP: `model` / `catalog` / `chat` без rag/splash.
 * Реэкспорт типов из `types/backend-client` для внутренних импортов сегмента.
 */

export type {
  AddMessageRequest,
  AddMessageResponse,
  BackendClient,
  CatalogApi,
  CatalogFilters,
  ChatApi,
  ChatData,
  ChatFile,
  ChatMessage,
  ChatModelRef,
  CreateChatRequest,
  DeleteChatRequest,
  DeleteChatResponse,
  GenerateProgress,
  GenerateRequest,
  GenerationSettings,
  GetCatalogRequest,
  GetChatRequest,
  GetModelInfoRequest,
  InstallProgress,
  InstallRequest,
  ListChatsRequest,
  ListChatsResponse,
  ListModelsRequest,
  ListModelsResponse,
  ModelApi,
  ModelCatalog,
  OllamaModel,
  OllamaModelInfo,
  ProviderConfig,
  RemoveRequest,
  UnarySuccess,
  UpdateChatRequest,
} from '../types/backend-client';
