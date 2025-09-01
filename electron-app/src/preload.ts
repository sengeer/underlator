// См. документацию Electron для деталей по использованию preload скриптов:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');
import type {
  IpcMessage,
  ModelDownloadProgress,
  ModelAvailability,
  ModelOperationResult,
  AvailableModels,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaDeleteRequest,
} from './types';

/**
 * Интерфейс для API Electron, доступного в renderer процессе
 * Обеспечивает безопасное взаимодействие между main и renderer процессами
 */
interface ElectronAPI {
  run: (text: { translate: string; text: string }) => Promise<any>;
  onStatus: (callback: (message: IpcMessage) => void) => () => void;
  updateTranslations: (translations: any) => void;
  ollama: {
    generate: (request: OllamaGenerateRequest) => Promise<string>;
    onGenerateProgress: (
      callback: (progress: OllamaGenerateResponse) => void
    ) => () => void;
  };
  models: {
    checkAvailability: () => Promise<ModelAvailability>;
    download: (modelName: string) => Promise<ModelOperationResult>;
    getAvailable: () => Promise<AvailableModels>;
    delete: (modelName: string) => Promise<ModelOperationResult>;
    onDownloadProgress: (
      callback: (progress: ModelDownloadProgress) => void
    ) => () => void;
    install: (request: OllamaPullRequest) => Promise<{ success: boolean }>;
    remove: (request: OllamaDeleteRequest) => Promise<{ success: boolean }>;
    list: () => Promise<any>;
    onInstallProgress: (
      callback: (progress: OllamaPullProgress) => void
    ) => () => void;
  };
}

/**
 * Здесь используется API `contextBridge` для экспозиции кастомного API в renderer процесс
 * Этот API позволяет renderer процессу вызывать событие `transformers:run` в main процессе
 * И также отправлять статус `transformers:status` обратно в react-app
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
} as ElectronAPI);

// Экспорт типов для использования в других модулях
export type { ElectronAPI };
