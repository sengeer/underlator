/**
 * Типы для Electron API
 * Расширяет глобальные типы для лучшей поддержки TypeScript
 */

declare global {
  interface Window {
    electron: {
      ollama: {
        generate: (request: any) => Promise<string>;
        stop: () => Promise<void>;
        onGenerateProgress: (callback: (progress: any) => void) => () => void;
      };
      models: {
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
  MENU?: string;
  ABOUT?: string;
  UNDO?: string;
  REDO?: string;
  CUT?: string;
  COPY?: string;
  PASTE?: string;
  SELECT_ALL?: string;
  QUIT?: string;
  DOWNLOADING_OLLAMA?: string;
  LOADING_APP?: string;
}
