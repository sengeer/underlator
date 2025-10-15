/**
 * @module PreloadTypes
 * Типы для preload.
 */

import type {
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaDeleteRequest,
} from './ollama';
import type { CatalogFilters } from './catalog';
import type { ModelCatalog, OllamaModelInfo } from './models';
import type { SplashMessages } from './splash';
import type { IpcResponse } from './ipc-handlers';
import type {
  CreateChatRequest,
  GetChatRequest,
  UpdateChatRequest,
  DeleteChatRequest,
  ListChatsRequest,
  AddMessageRequest,
  CreateChatResult,
  GetChatResult,
  UpdateChatResult,
  DeleteChatResult,
  ListChatsResult,
  AddMessageResult,
} from './chat';

/**
 * Интерфейс для API Electron, доступного в renderer процессе.
 * Обеспечивает безопасное взаимодействие между main и renderer процессами.
 */
export interface ElectronAPI {
  updateTranslations: (translations: any) => void;
  model: {
    generate: (
      request: OllamaGenerateRequest,
      config?: any
    ) => Promise<IpcResponse<string>>;
    stop: () => Promise<void>;
    onGenerateProgress: (
      callback: (progress: OllamaGenerateResponse) => void
    ) => () => void;
    install: (request: OllamaPullRequest) => Promise<{ success: boolean }>;
    remove: (request: OllamaDeleteRequest) => Promise<{ success: boolean }>;
    list: () => Promise<any>;
    onInstallProgress: (
      callback: (progress: OllamaPullProgress) => void
    ) => () => void;
  };
  catalog: {
    get: (params?: { forceRefresh?: boolean }) => Promise<ModelCatalog>;
    search: (filters: CatalogFilters) => Promise<ModelCatalog>;
    getModelInfo: (params: {
      modelName: string;
    }) => Promise<OllamaModelInfo | null>;
  };
  splash: {
    getStatus: () => Promise<SplashMessages>;
    onStatusUpdate: (callback: (status: SplashMessages) => void) => () => void;
    onProgressUpdate: (callback: (progress: number) => void) => () => void;
    onComplete: (callback: () => void) => () => void;
    onError: (callback: (error: string) => void) => () => void;
  };
  chat: {
    create: (request: CreateChatRequest) => Promise<CreateChatResult>;
    get: (request: GetChatRequest) => Promise<GetChatResult>;
    update: (request: UpdateChatRequest) => Promise<UpdateChatResult>;
    delete: (request: DeleteChatRequest) => Promise<DeleteChatResult>;
    list: (request?: ListChatsRequest) => Promise<ListChatsResult>;
    addMessage: (request: AddMessageRequest) => Promise<AddMessageResult>;
  };
}
