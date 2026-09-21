/**
 * @module ElectronTransport
 * Адаптер к `window.electron` с unwrap `IpcResponse`. Без `fetch`.
 */

import type {
  BackendClient,
  CatalogApi,
  ChatApi,
  ModelApi,
} from '../backend-client';
import { BackendError, unwrapIpcResponse } from '../errors';
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
} from '../types';

function requireElectron(): Window['electron'] {
  if (typeof window === 'undefined' || !window.electron) {
    throw new BackendError('internal', 'Electron API недоступен');
  }
  return window.electron;
}

function requireModel(): Window['electron']['model'] {
  const electron = requireElectron();
  if (!electron.model) {
    throw new BackendError('internal', 'Electron API недоступен');
  }
  return electron.model;
}

function requireCatalog(): Window['electron']['catalog'] {
  const electron = requireElectron();
  if (!electron.catalog) {
    throw new BackendError('internal', 'Electron API недоступен');
  }
  return electron.catalog;
}

function requireChat(): Window['electron']['chat'] {
  const electron = requireElectron();
  if (!electron.chat) {
    throw new BackendError('internal', 'Electron API недоступен');
  }
  return electron.chat;
}

/**
 * Транспорт Electron IPC. Fail closed без fallback на HTTP.
 */
export class ElectronTransport implements BackendClient {
  readonly model: ModelApi;
  readonly catalog: CatalogApi;
  readonly chat: ChatApi;

  constructor() {
    this.model = {
      generate: (request, config) => this.generate(request, config),
      stop: () => this.stop(),
      install: (request) => this.install(request),
      remove: (request) => this.remove(request),
      list: () => this.list(),
      onGenerateProgress: (callback) => this.onGenerateProgress(callback),
      onInstallProgress: (callback) => this.onInstallProgress(callback),
    };
    this.catalog = {
      get: (params) => this.getCatalog(params),
      search: (filters) => this.searchCatalog(filters),
      getModelInfo: (params) => this.getModelInfo(params),
    };
    this.chat = {
      create: (request) => this.createChat(request),
      get: (request) => this.getChat(request),
      update: (request) => this.updateChat(request),
      delete: (request) => this.deleteChat(request),
      list: (request) => this.listChats(request),
      addMessage: (request) => this.addMessage(request),
    };
  }

  private async generate(
    request: GenerateRequest,
    config?: Partial<ProviderConfig>
  ): Promise<string> {
    const response = await requireModel().generate(request, config);
    return unwrapIpcResponse<string>(response);
  }

  private async stop(): Promise<void> {
    const response = await requireModel().stop();
    unwrapIpcResponse(response);
  }

  private async install(request: InstallRequest): Promise<UnarySuccess> {
    const response = await requireModel().install(request);
    return unwrapIpcResponse<UnarySuccess>(response);
  }

  private async remove(request: RemoveRequest): Promise<UnarySuccess> {
    const response = await requireModel().remove(request);
    return unwrapIpcResponse<UnarySuccess>(response);
  }

  private async list(): Promise<ListModelsResponse> {
    const response = await requireModel().list();
    return unwrapIpcResponse<ListModelsResponse>(response);
  }

  private onGenerateProgress(
    callback: (progress: GenerateProgress) => void
  ): () => void {
    return requireModel().onGenerateProgress(callback);
  }

  private onInstallProgress(
    callback: (progress: InstallProgress) => void
  ): () => void {
    return requireModel().onInstallProgress(callback);
  }

  private async getCatalog(
    params: GetCatalogRequest = {}
  ): Promise<ModelCatalog> {
    const response = await requireCatalog().get(params);
    return unwrapIpcResponse<ModelCatalog>(response);
  }

  private async searchCatalog(filters: CatalogFilters): Promise<ModelCatalog> {
    const response = await requireCatalog().search(filters);
    return unwrapIpcResponse<ModelCatalog>(response);
  }

  private async getModelInfo(
    params: GetModelInfoRequest
  ): Promise<OllamaModelInfo | null> {
    const response = await requireCatalog().getModelInfo(params);
    return unwrapIpcResponse<OllamaModelInfo | null>(response);
  }

  private async createChat(request: CreateChatRequest): Promise<ChatData> {
    const response = await requireChat().create(request);
    return unwrapIpcResponse<ChatData>(response);
  }

  private async getChat(request: GetChatRequest): Promise<ChatData> {
    const response = await requireChat().get(request);
    return unwrapIpcResponse<ChatData>(response);
  }

  private async updateChat(request: UpdateChatRequest): Promise<ChatData> {
    const response = await requireChat().update(request);
    return unwrapIpcResponse<ChatData>(response);
  }

  private async deleteChat(
    request: DeleteChatRequest
  ): Promise<DeleteChatResponse> {
    const response = await requireChat().delete(request);
    return unwrapIpcResponse<DeleteChatResponse>(response);
  }

  private async listChats(
    request: ListChatsRequest = {}
  ): Promise<ListChatsResponse> {
    const response = await requireChat().list(request);
    return unwrapIpcResponse<ListChatsResponse>(response);
  }

  private async addMessage(
    request: AddMessageRequest
  ): Promise<AddMessageResponse> {
    const response = await requireChat().addMessage(request);
    return unwrapIpcResponse<AddMessageResponse>(response);
  }
}
