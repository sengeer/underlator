/**
 * @module HttpTransport
 * REST `fetch` + SSE (`text/event-stream`). WebSocket не используется.
 */

import type {
  BackendClient,
  CatalogApi,
  ChatApi,
  ModelApi,
} from '../backend-client';
import { BackendError, backendErrorFromResponse } from '../errors';
import { parseSseData, readSseFrames } from '../sse';
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
import { DEFAULT_PROVIDER_ID, DEFAULT_PROVIDER_URL } from '../types';

export interface HttpTransportOptions {
  /** Base URL без trailing slash. Пусто = relative `/api/...`. */
  baseUrl?: string;
  /** Bearer-токен для `/api/*`. */
  token?: string;
  /** Инъекция fetch (тесты). */
  fetch?: typeof fetch;
}

function envBaseUrl(): string {
  return (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '');
}

function envToken(): string {
  return import.meta.env.VITE_BACKEND_TOKEN ?? '';
}

function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      search.set(key, value.join(','));
      continue;
    }
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/**
 * HTTP-транспорт карты атома 3.1.
 */
export class HttpTransport implements BackendClient {
  readonly model: ModelApi;
  readonly catalog: CatalogApi;
  readonly chat: ChatApi;

  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly generateListeners = new Set<
    (progress: GenerateProgress) => void
  >();
  private readonly installListeners = new Set<
    (progress: InstallProgress) => void
  >();
  private activeSseAbort: AbortController | null = null;

  constructor(options: HttpTransportOptions = {}) {
    this.baseUrl = options.baseUrl ?? envBaseUrl();
    this.token = options.token ?? envToken();
    this.fetchImpl = options.fetch ?? fetch.bind(globalThis);
    this.model = {
      generate: (request, config) => this.generate(request, config),
      stop: () => this.stop(),
      install: (request) => this.install(request),
      remove: (request) => this.remove(request),
      list: () => this.listModels(),
      onGenerateProgress: (callback) => {
        this.generateListeners.add(callback);
        return () => {
          this.generateListeners.delete(callback);
        };
      },
      onInstallProgress: (callback) => {
        this.installListeners.add(callback);
        return () => {
          this.installListeners.delete(callback);
        };
      },
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
      addMessage: (request) => this.addChatMessage(request),
    };
  }

  private apiUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private headers(accept: string, hasBody: boolean): HeadersInit {
    const headers: Record<string, string> = { Accept: accept };
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request(
    method: string,
    path: string,
    options: {
      body?: unknown;
      accept?: string;
      signal?: AbortSignal;
    } = {}
  ): Promise<Response> {
    const accept = options.accept ?? 'application/json';
    const hasBody = options.body !== undefined;
    const response = await this.fetchImpl(this.apiUrl(path), {
      method,
      headers: this.headers(accept, hasBody),
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
    if (!response.ok) {
      throw await backendErrorFromResponse(response);
    }
    return response;
  }

  private async unary<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await this.request(method, path, { body });
    const text = await response.text();
    if (text === '' || text === 'null') {
      return null as T;
    }
    return JSON.parse(text) as T;
  }

  private async consumeSse<T>(
    method: string,
    path: string,
    body: unknown,
    progressEvent: string,
    onProgress: (data: unknown) => void,
    parseResult: (data: unknown) => T
  ): Promise<T> {
    const abort = new AbortController();
    this.activeSseAbort = abort;
    try {
      const response = await this.request(method, path, {
        body,
        accept: 'text/event-stream',
        signal: abort.signal,
      });
      if (!response.body) {
        throw new BackendError('internal', 'Пустое тело SSE');
      }
      let resolved: T | undefined;
      let gotResult = false;
      for await (const frame of readSseFrames(response.body, abort.signal)) {
        if (frame.event === progressEvent) {
          onProgress(parseSseData(frame.data));
          continue;
        }
        if (frame.event === 'result') {
          gotResult = true;
          resolved = parseResult(parseSseData(frame.data));
        }
      }
      if (!gotResult) {
        throw new BackendError(
          abort.signal.aborted ? 'cancelled' : 'internal',
          abort.signal.aborted
            ? 'Генерация отменена'
            : 'SSE закрыт без события result'
        );
      }
      return resolved as T;
    } catch (error) {
      if (error instanceof BackendError) {
        throw error;
      }
      if (isAbortError(error) || abort.signal.aborted) {
        throw new BackendError('cancelled', 'Генерация отменена');
      }
      throw error;
    } finally {
      if (this.activeSseAbort === abort) {
        this.activeSseAbort = null;
      }
    }
  }

  private async generate(
    request: GenerateRequest,
    config?: Partial<ProviderConfig>
  ): Promise<string> {
    const body = {
      ...request,
      id: config?.id ?? DEFAULT_PROVIDER_ID,
      url: config?.url ?? DEFAULT_PROVIDER_URL,
    };
    return this.consumeSse(
      'POST',
      '/api/model/generate',
      body,
      'model:generate-progress',
      (data) => {
        this.generateListeners.forEach((listener) => {
          listener(data as GenerateProgress);
        });
      },
      (data) => String(data)
    );
  }

  private async stop(): Promise<void> {
    this.activeSseAbort?.abort();
    await this.unary('POST', '/api/model/stop', undefined);
  }

  private async install(request: InstallRequest): Promise<UnarySuccess> {
    return this.consumeSse(
      'POST',
      '/api/model/install',
      request,
      'model:install-progress',
      (data) => {
        this.installListeners.forEach((listener) => {
          listener(data as InstallProgress);
        });
      },
      (data) => data as UnarySuccess
    );
  }

  private remove(request: RemoveRequest): Promise<UnarySuccess> {
    return this.unary<UnarySuccess>('POST', '/api/model/remove', request);
  }

  private listModels(): Promise<ListModelsResponse> {
    return this.unary<ListModelsResponse>('GET', '/api/model/list');
  }

  private getCatalog(params: GetCatalogRequest = {}): Promise<ModelCatalog> {
    const query = toQuery({ forceRefresh: params.forceRefresh });
    return this.unary<ModelCatalog>('GET', `/api/catalog${query}`);
  }

  private searchCatalog(filters: CatalogFilters): Promise<ModelCatalog> {
    return this.unary<ModelCatalog>('POST', '/api/catalog/search', filters);
  }

  private getModelInfo(
    params: GetModelInfoRequest
  ): Promise<OllamaModelInfo | null> {
    const name = encodeURIComponent(params.modelName);
    return this.unary<OllamaModelInfo | null>(
      'GET',
      `/api/catalog/models/${name}`
    );
  }

  private createChat(request: CreateChatRequest): Promise<ChatData> {
    return this.unary<ChatData>('POST', '/api/chat', request);
  }

  private getChat(request: GetChatRequest): Promise<ChatData> {
    const id = encodeURIComponent(request.chatId);
    const query = toQuery({
      includeMessages: request.includeMessages,
      messageLimit: request.messageLimit,
      messageOffset: request.messageOffset,
    });
    return this.unary<ChatData>('GET', `/api/chat/${id}${query}`);
  }

  private updateChat(request: UpdateChatRequest): Promise<ChatData> {
    const id = encodeURIComponent(request.chatId);
    return this.unary<ChatData>('PATCH', `/api/chat/${id}`, request);
  }

  private deleteChat(request: DeleteChatRequest): Promise<DeleteChatResponse> {
    const id = encodeURIComponent(request.chatId);
    const query = toQuery({
      confirmed: request.confirmed,
      createBackup: request.createBackup,
    });
    return this.unary<DeleteChatResponse>('DELETE', `/api/chat/${id}${query}`);
  }

  private listChats(
    request: ListChatsRequest = {}
  ): Promise<ListChatsResponse> {
    const query = toQuery({
      limit: request.limit,
      offset: request.offset,
      createdAfter: request.createdAfter,
      createdBefore: request.createdBefore,
      updatedAfter: request.updatedAfter,
      updatedBefore: request.updatedBefore,
      searchQuery: request.searchQuery,
      modelFilter: request.modelFilter,
      sortBy: request.sortBy,
      sortOrder: request.sortOrder,
    });
    return this.unary<ListChatsResponse>('GET', `/api/chat${query}`);
  }

  private addChatMessage(
    request: AddMessageRequest
  ): Promise<AddMessageResponse> {
    const id = encodeURIComponent(request.chatId);
    return this.unary<AddMessageResponse>(
      'POST',
      `/api/chat/${id}/messages`,
      request
    );
  }
}
