/**
 * @module Types
 * @description Индексный файл для экспорта всех типов
 * Централизованный экспорт для удобства импорта в других модулях
 */

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
  OllamaErrorCallback,
  OllamaOperationStatus,
  OllamaOperationResult,
} from './ollama.types';

// Экспорт типов моделей
export type {
  BaseModel,
  OllamaModelInfo,
  HuggingFaceModelInfo,
  ModelInfo,
  ModelStatus,
  ModelDownloadProgress,
  ModelWithStatus,
  ModelCatalog,
  ModelFilters,
  ModelOperationResult,
  ModelInstallParams,
  ModelRemoveParams,
} from './models.types';

// Экспорт типов генерации
export type {
  GenerationParams,
  ResponseMode,
  UsageType,
  TranslationDirection,
  ContextualTranslationParams,
  FullGenerationParams,
  ModelResponse,
  GenerationProgress,
  GenerationStatus,
  GenerationResult,
  ResponseCallback,
  ProgressCallback,
  ErrorCallback,
  GenerationConfig,
  GenerationContext,
  FullGenerationContext,
} from './generation.types';

// Экспорт типов Electron
export type {
  IpcMessage,
  ModelDownloadProgress as ElectronModelDownloadProgress,
  ModelAvailability,
  ModelOperationResult as ElectronModelOperationResult,
  ModelConfig,
  AvailableModels,
  MenuTranslations,
  TransformersArgs,
  WorkerStatus,
  TransformersProgress,
} from './electron';
