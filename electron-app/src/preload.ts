// См. документацию Electron для деталей по использованию preload скриптов:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');
import type {
  IpcMessage,
  ModelDownloadProgress,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaDeleteRequest,
  CatalogFilters,
  ElectronAPI,
} from './types';

/**
 * Здесь используется API `contextBridge` для экспозиции кастомного API в renderer процесс
 */
contextBridge.exposeInMainWorld('electron', {
  run: (text: { translate: string; text: string }) =>
    ipcRenderer.invoke('transformers:run', text),

  onStatus: (callback: (message: IpcMessage) => void) => {
    const subscription = (_event: any, message: IpcMessage) =>
      callback(message);
    ipcRenderer.on('transformers:status', subscription);

    return () => {
      ipcRenderer.removeListener('transformers:status', subscription);
    };
  },

  updateTranslations: (translations: any) => {
    ipcRenderer.send('update-translations', translations);
  },

  // API для Ollama генерации
  ollama: {
    generate: (request: OllamaGenerateRequest) =>
      ipcRenderer.invoke('ollama:generate', request),

    onGenerateProgress: (
      callback: (progress: OllamaGenerateResponse) => void
    ) => {
      const subscription = (_event: any, progress: OllamaGenerateResponse) =>
        callback(progress);
      ipcRenderer.on('ollama:generate-progress', subscription);

      return () => {
        ipcRenderer.removeListener('ollama:generate-progress', subscription);
      };
    },
  },

  // API для управления моделями
  models: {
    checkAvailability: () => ipcRenderer.invoke('models:check-availability'),

    download: (modelName: string) =>
      ipcRenderer.invoke('models:download', modelName),

    getAvailable: () => ipcRenderer.invoke('models:get-available'),

    delete: (modelName: string) =>
      ipcRenderer.invoke('models:delete', modelName),

    onDownloadProgress: (
      callback: (progress: ModelDownloadProgress) => void
    ) => {
      const subscription = (_event: any, progress: ModelDownloadProgress) =>
        callback(progress);
      ipcRenderer.on('models:download-progress', subscription);

      return () => {
        ipcRenderer.removeListener('models:download-progress', subscription);
      };
    },

    // Новые методы для Ollama моделей
    install: (request: OllamaPullRequest) =>
      ipcRenderer.invoke('models:install', request),

    remove: (request: OllamaDeleteRequest) =>
      ipcRenderer.invoke('models:remove', request),

    list: () => ipcRenderer.invoke('models:list'),

    onInstallProgress: (callback: (progress: OllamaPullProgress) => void) => {
      const subscription = (_event: any, progress: OllamaPullProgress) =>
        callback(progress);
      ipcRenderer.on('models:install-progress', subscription);

      return () => {
        ipcRenderer.removeListener('models:install-progress', subscription);
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
    updateStatus: (status: any) =>
      ipcRenderer.invoke('splash:update-status', status),

    setProgress: (progress: number) =>
      ipcRenderer.invoke('splash:set-progress', { progress }),

    complete: () => ipcRenderer.invoke('splash:complete', {}),

    error: (error: string) => ipcRenderer.invoke('splash:error', { error }),

    getStatus: () => ipcRenderer.invoke('splash:get-status', {}),

    hide: () => ipcRenderer.invoke('splash:hide', {}),

    on: (channel: string, callback: (message: any) => void) => {
      const subscription = (_event: any, message: any) => callback(message);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
  },
} as ElectronAPI);
