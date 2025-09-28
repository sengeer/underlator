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
  CatalogFilters,
  ElectronAPI,
  SplashMessages,
} from './types';

/**
 * Здесь используется API `contextBridge` для экспозиции кастомного API в renderer процесс.
 */
contextBridge.exposeInMainWorld('electron', {
  // API для i18n локализации Electron
  updateTranslations: (translations: any) => {
    ipcRenderer.send('update-translations', translations);
  },

  // API для Ollama генерации
  ollama: {
    generate: (request: OllamaGenerateRequest) =>
      ipcRenderer.invoke('ollama:generate', request),

    stop: () => ipcRenderer.invoke('ollama:stop'),

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
} as ElectronAPI);
