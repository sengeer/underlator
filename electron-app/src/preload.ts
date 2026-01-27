/**
 * @module Preload
 * Preload содержит код, который выполняется в процессе рендерера.
 * См. документацию Electron для деталей по использованию preload скриптов:
 * https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
 */

const { contextBridge, ipcRenderer } = require('electron');
import type {
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaDeleteRequest,
} from './types/ollama';
import type { CatalogFilters } from './types/catalog';
import type { ElectronApiConfig } from './types/electron';
import type { SplashMessages } from './types/splash';
import type {
  CreateChatRequest,
  GetChatRequest,
  UpdateChatRequest,
  DeleteChatRequest,
  ListChatsRequest,
  AddMessageRequest,
} from './types/chat';
import type { ElectronAPI } from './types/preload';
import type {
  RagResponse,
  VectorCollection,
  CollectionStats,
  QueryDocumentsConfig,
  UploadAndProcessDocumentConfig,
} from './types/rag';
import type {
  ProcessDocumentRequest,
  ProcessDocumentResult,
  UploadAndProcessDocumentRequest,
  RagQueryRequest,
  DeleteCollectionRequest,
  DeleteCollectionResult,
  RagProcessingProgress,
} from './types/rag-handlers';

/**
 * Здесь используется API `contextBridge` для экспозиции кастомного API в renderer процесс.
 */
contextBridge.exposeInMainWorld('electron', {
  // API для i18n локализации Electron
  updateTranslations: (translations: any) => {
    ipcRenderer.send('update-translations', translations);
  },
  openMail: (email: string) => {
    ipcRenderer.send('contact-mail', email);
  },

  // API для управления моделями
  model: {
    generate: (request: OllamaGenerateRequest, config: ElectronApiConfig) =>
      ipcRenderer.invoke('model:generate', request, config),

    stop: () => ipcRenderer.invoke('model:stop'),

    onGenerateProgress: (
      callback: (progress: OllamaGenerateResponse) => void
    ) => {
      const subscription = (_event: any, progress: OllamaGenerateResponse) =>
        callback(progress);
      ipcRenderer.on('model:generate-progress', subscription);

      return () => {
        ipcRenderer.removeListener('model:generate-progress', subscription);
      };
    },

    // Новые методы для Ollama моделей
    install: (request: OllamaPullRequest) =>
      ipcRenderer.invoke('model:install', request),

    remove: (request: OllamaDeleteRequest) =>
      ipcRenderer.invoke('model:remove', request),

    list: () => ipcRenderer.invoke('model:list'),

    onInstallProgress: (callback: (progress: OllamaPullProgress) => void) => {
      const subscription = (_event: any, progress: OllamaPullProgress) =>
        callback(progress);
      ipcRenderer.on('model:install-progress', subscription);

      return () => {
        ipcRenderer.removeListener('model:install-progress', subscription);
      };
    },
  },

  // API для каталога моделей
  catalog: {
    get: (params?: { forceRefresh?: boolean }) =>
      ipcRenderer.invoke('catalog:get', params || {}),

    search: (filters: CatalogFilters) =>
      ipcRenderer.invoke('catalog:search', filters),

    getModelInfo: (params: { modelName: string }) =>
      ipcRenderer.invoke('catalog:get-model-info', params),
  },

  // API для splash screen
  splash: {
    getStatus: () => ipcRenderer.invoke('splash:get-status', {}),

    onStatusUpdate: (callback: (status: SplashMessages) => void) => {
      const subscription = (_event: any, status: SplashMessages) =>
        callback(status);
      ipcRenderer.on('splash:status-update', subscription);

      return () => {
        ipcRenderer.removeListener('splash:status-update', subscription);
      };
    },

    onProgressUpdate: (callback: (progress: number) => void) => {
      const subscription = (_event: any, progress: number) =>
        callback(progress);
      ipcRenderer.on('splash:progress-update', subscription);

      return () => {
        ipcRenderer.removeListener('splash:progress-update', subscription);
      };
    },

    onComplete: (callback: () => void) => {
      const subscription = (_event: any) => callback();
      ipcRenderer.on('splash:complete', subscription);

      return () => {
        ipcRenderer.removeListener('splash:complete', subscription);
      };
    },

    onError: (callback: (error: string) => void) => {
      const subscription = (_event: any, error: string) => callback(error);
      ipcRenderer.on('splash:error', subscription);

      return () => {
        ipcRenderer.removeListener('splash:error', subscription);
      };
    },
  },

  // API для работы с чатами
  chat: {
    create: (request: CreateChatRequest) =>
      ipcRenderer.invoke('chat:create', request),

    get: (request: GetChatRequest) => ipcRenderer.invoke('chat:get', request),

    update: (request: UpdateChatRequest) =>
      ipcRenderer.invoke('chat:update', request),

    delete: (request: DeleteChatRequest) =>
      ipcRenderer.invoke('chat:delete', request),

    list: (request: ListChatsRequest = {}) =>
      ipcRenderer.invoke('chat:list', request),

    addMessage: (request: AddMessageRequest) =>
      ipcRenderer.invoke('chat:add-message', request),
  },

  // API для работы с RAG системой
  rag: {
    processDocument: (
      request: ProcessDocumentRequest,
      config?: UploadAndProcessDocumentConfig
    ): Promise<ProcessDocumentResult> =>
      ipcRenderer.invoke('rag:process-document', request, config || {}),

    uploadAndProcessDocument: (
      request: UploadAndProcessDocumentRequest,
      config: UploadAndProcessDocumentConfig
    ): Promise<ProcessDocumentResult> =>
      ipcRenderer.invoke('rag:upload-and-process-document', request, config),

    queryDocuments: (
      request: RagQueryRequest,
      config: QueryDocumentsConfig
    ): Promise<RagResponse> =>
      ipcRenderer.invoke('rag:query-documents', request, config),

    deleteDocumentCollection: (
      request: DeleteCollectionRequest
    ): Promise<DeleteCollectionResult> =>
      ipcRenderer.invoke('rag:delete-collection', request),

    getCollectionStats: (chatId: string): Promise<CollectionStats> =>
      ipcRenderer.invoke('rag:get-collection-stats', { chatId }),

    listCollections: async (): Promise<VectorCollection[]> => {
      const response = await ipcRenderer.invoke('rag:list-collections');
      return (response as any).data || [];
    },

    onProcessingProgress: (
      callback: (progress: RagProcessingProgress) => void
    ): (() => void) => {
      const subscription = (_event: any, progress: RagProcessingProgress) =>
        callback(progress);
      ipcRenderer.on('rag:processing-progress', subscription);

      return () => {
        ipcRenderer.removeListener('rag:processing-progress', subscription);
      };
    },
  },
} as ElectronAPI);
