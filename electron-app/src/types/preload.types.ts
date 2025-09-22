/**
 * @module PreloadTypes
 * @description Типы для работы с preload
 * Определяет интерфейсы для API Electron, доступного в renderer процессе
 */

import type {
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaDeleteRequest,
  ModelCatalog,
  OllamaModelInfo,
  CatalogFilters,
  SplashMessages,
} from './index';

/**
 * Интерфейс для API Electron, доступного в renderer процессе
 * Обеспечивает безопасное взаимодействие между main и renderer процессами
 */
export interface ElectronAPI {
  updateTranslations: (translations: any) => void;
  ollama: {
    generate: (request: OllamaGenerateRequest) => Promise<string>;
    stop: () => Promise<void>;
    onGenerateProgress: (
      callback: (progress: OllamaGenerateResponse) => void
    ) => () => void;
  };
  models: {
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
}
