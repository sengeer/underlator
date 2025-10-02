/**
 * @module Types
 * Индексный файл для экспорта всех типов.
 */

export type { ElectronAPI } from './preload';

export type {
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaModelsResponse,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaDeleteRequest,
  OllamaDeleteResponse,
  OllamaApiConfig,
  OllamaStreamCallback,
  OllamaProgressCallback,
  OllamaOperationResult,
} from './ollama';

export type {
  OllamaModelInfo,
  ModelStatus,
  ModelCatalog,
  ModelFilters,
} from './models';

export type { ParsedModel, ParseResult, QuantizedModel } from './parser';

export type {
  CatalogFilters,
  ModelCatalogConfig,
  CachedCatalog,
} from './catalog';

export type { SplashStatus, SplashMessages } from './splash';

export type { MenuTranslations, ElectronApiConfig } from './electron';

export type { IpcMessage, IpcResponse } from './ipc-handlers';
