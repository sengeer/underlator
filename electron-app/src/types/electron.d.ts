/**
 * Типы для Electron API
 * Расширяет глобальные типы для лучшей поддержки TypeScript
 */

declare global {
  interface Window {
    electron: {
      run: (data: { translate: string; text: string }) => Promise<any>;
      onStatus: (callback: (message: any) => void) => () => void;
      updateTranslations: (translations: any) => void;
      ollama: {
        generate: (request: any) => Promise<string>;
        onGenerateProgress: (callback: (progress: any) => void) => () => void;
      };
      models: {
        checkAvailability: () => Promise<any>;
        download: (modelName: string) => Promise<any>;
        getAvailable: () => Promise<any>;
        delete: (modelName: string) => Promise<any>;
        onDownloadProgress: (callback: (progress: any) => void) => () => void;
        install: (request: any) => Promise<{ success: boolean }>;
        remove: (request: any) => Promise<{ success: boolean }>;
        list: () => Promise<any>;
        onInstallProgress: (callback: (progress: any) => void) => () => void;
      };
      catalog: {
        get: (params?: { forceRefresh?: boolean }) => Promise<any>;
        search: (filters: any) => Promise<any>;
        getModelInfo: (params: { modelName: string }) => Promise<any>;
      };
    };
  }
}

export {};

/**
 * Типы для прогресса загрузки моделей
 */
export interface ModelDownloadProgress {
  modelName: string;
  currentFile: string;
  fileProgress: number;
  overallProgress: number;
  completedFiles: number;
  totalFiles: number;
  downloadedSize: number;
  totalSize: number;
}

/**
 * Типы для переводов меню
 */
export interface MenuTranslations {
  menu?: string;
  about?: string;
  undo?: string;
  redo?: string;
  cut?: string;
  copy?: string;
  paste?: string;
  selectAll?: string;
  quit?: string;
}
