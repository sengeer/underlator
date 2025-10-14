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

export type {
  FileSystemOperationResult,
  FileSystemConfig,
  ChatFileInfo,
  ChatFileStructure,
  FileLockStatus,
  BackupInfo,
  FileSystemStats,
} from './filesystem';

export type {
  ChatMessageRole,
  ChatOperationStatus,
  ChatMessage,
  ChatData,
  ChatFile,
  CreateChatRequest,
  UpdateChatRequest,
  AddMessageRequest,
  GetChatRequest,
  ListChatsRequest,
  DeleteChatRequest,
  ChatOperationResult,
  CreateChatResult,
  GetChatResult,
  UpdateChatResult,
  DeleteChatResult,
  ListChatsResult,
  AddMessageResult,
} from './chat';
