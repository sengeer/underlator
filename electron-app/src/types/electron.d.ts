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
      models: {
        checkAvailability: () => Promise<any>;
        download: (modelName: string) => Promise<any>;
        getAvailable: () => Promise<any>;
        delete: (modelName: string) => Promise<any>;
        onDownloadProgress: (callback: (progress: any) => void) => () => void;
      };
    };
  }
}

export {};

/**
 * Типы для IPC сообщений
 */
export interface IpcMessage {
  status: 'progress' | 'message' | 'complete' | 'error';
  data?: any;
  error?: string;
}

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
 * Типы для доступности моделей
 */
export interface ModelAvailability {
  [modelName: string]: boolean;
}

/**
 * Типы для результата операций с моделями
 */
export interface ModelOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Типы для конфигурации модели
 */
export interface ModelConfig {
  name: string;
  displayName: string;
  huggingfaceRepo: string;
  files: string[];
}

/**
 * Типы для доступных моделей
 */
export interface AvailableModels {
  [modelName: string]: ModelConfig;
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
}

/**
 * Типы для аргументов трансформеров
 */
export interface TransformersArgs {
  translate: string;
  text: string;
}

/**
 * Типы для статуса воркера
 */
export interface WorkerStatus {
  status: 'progress' | 'message' | 'complete' | 'error';
  data?: any;
  error?: string;
}

/**
 * Типы для прогресса трансформеров
 */
export interface TransformersProgress {
  file: string;
  progress: number;
}
