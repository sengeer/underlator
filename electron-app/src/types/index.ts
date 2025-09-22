/**
 * @module Types
 * @description Индексный файл для экспорта всех типов
 * Централизованный экспорт для удобства импорта в других модулях
 */

// Экспорт типов preload
export type { ElectronAPI } from './preload.types';

// Экспорт типов Ollama
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
} from './ollama.types';

// Экспорт типов моделей
export type {
  OllamaModelInfo,
  ModelStatus,
  ModelCatalog,
  ModelFilters,
} from './models.types';

// Экспорт типов парсера
export type { ParsedModel, ParseResult, QuantizedModel } from './parser.types';

// Экспорт типов каталога моделей
export type {
  CatalogFilters,
  ModelCatalogConfig,
  CachedCatalog,
} from './catalog.types';

// Экспорт типов splash screen (React архитектура)
export type {
  SplashStatus,
  SplashMessages,
  SplashStatusCallback,
  SplashProgressCallback,
  SplashCompleteCallback,
  SplashErrorCallback,
} from './splash.types';

// Экспорт типов Electron
export type {
  ModelDownloadProgress as ElectronModelDownloadProgress,
  MenuTranslations,
} from './electron';
