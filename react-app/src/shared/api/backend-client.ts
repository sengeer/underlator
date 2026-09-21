/**
 * @module BackendClient
 * Публичный контракт MVP: `model` / `catalog` / `chat` без rag/splash.
 */

import type {
  AddMessageRequest,
  AddMessageResponse,
  CatalogFilters,
  ChatData,
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

/** Фасад `model` (5 операций + 2 подписки). */
export interface ModelApi {
  generate(
    request: GenerateRequest,
    config?: Partial<ProviderConfig>
  ): Promise<string>;
  stop(): Promise<void>;
  install(request: InstallRequest): Promise<UnarySuccess>;
  remove(request: RemoveRequest): Promise<UnarySuccess>;
  list(): Promise<ListModelsResponse>;
  onGenerateProgress(
    callback: (progress: GenerateProgress) => void
  ): () => void;
  onInstallProgress(callback: (progress: InstallProgress) => void): () => void;
}

/** Фасад `catalog`. */
export interface CatalogApi {
  get(params?: GetCatalogRequest): Promise<ModelCatalog>;
  search(filters: CatalogFilters): Promise<ModelCatalog>;
  getModelInfo(params: GetModelInfoRequest): Promise<OllamaModelInfo | null>;
}

/** Фасад `chat`. */
export interface ChatApi {
  create(request: CreateChatRequest): Promise<ChatData>;
  get(request: GetChatRequest): Promise<ChatData>;
  update(request: UpdateChatRequest): Promise<ChatData>;
  delete(request: DeleteChatRequest): Promise<DeleteChatResponse>;
  list(request?: ListChatsRequest): Promise<ListChatsResponse>;
  addMessage(request: AddMessageRequest): Promise<AddMessageResponse>;
}

/**
 * Transport-agnostic клиент MVP preload surface.
 * Успех = тело DTO ядра; ошибка = throw BackendError.
 */
export interface BackendClient {
  readonly model: ModelApi;
  readonly catalog: CatalogApi;
  readonly chat: ChatApi;
}
