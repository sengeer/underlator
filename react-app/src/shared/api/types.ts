/**
 * @module BackendClientTypes
 * Зеркало DTO ядра / preload-ключей MVP без envelope `IpcResponse`.
 */

/** Режим транспорта BackendClient. */
export type BackendMode = 'http' | 'electron' | 'tauri';

/** Класс ошибки host (как JSON `{ class }` server 3.1). */
export type BackendErrorClass =
  | 'invalid'
  | 'not_found'
  | 'cancelled'
  | 'unsupported'
  | 'provider'
  | 'http'
  | 'storage'
  | 'internal';

/** Конфиг провайдера (`id` / `url`) для generate. */
export interface ProviderConfig {
  /** Идентификатор провайдера. */
  id: string;
  /** URL провайдера. */
  url: string;
}

/**
 * Тело generate без обязательных `id`/`url`.
 * HTTP-транспорт подставляет конфиг в тот же JSON.
 */
export interface GenerateRequest {
  /** Название модели. */
  model: string;
  /** Текст промпта. */
  prompt: string;
  /** Системный промпт. */
  system?: string;
  /** Температура генерации. */
  temperature?: number;
  /** Максимум токенов в ответе. */
  max_tokens?: number;
  /** Лимит предсказания токенов. */
  num_predict?: number;
  /** Режим «думания» модели. */
  think?: boolean;
  /** Контекст продолжения генерации. */
  context?: number[];
}

/** Chunk потока generate (`model:generate-progress`). */
export interface GenerateProgress {
  /** Название модели. */
  model: string;
  /** Фрагмент текста. */
  response: string;
  /** Время создания chunk. */
  created_at: string;
  /** Поток завершён. */
  done: boolean;
  /** Полная длительность. */
  total_duration?: number;
  /** Время загрузки модели. */
  load_duration?: number;
  /** Время оценки промпта. */
  prompt_eval_duration?: number;
  /** Время генерации. */
  eval_duration?: number;
  /** Число токенов промпта. */
  prompt_eval_count?: number;
  /** Число сгенерированных токенов. */
  eval_count?: number;
  /** Контекст продолжения. */
  context?: number[];
  /** Ошибка chunk (Electron legacy). */
  error?: string;
  /** Дополнительные поля chunk. */
  [key: string]: unknown;
}

/** Запрос установки модели. */
export interface InstallRequest {
  /** Название модели. */
  name: string;
  /** Необязательный тег. */
  tag?: string;
  /** Необязательный реестр. */
  registry?: string;
  /** Разрешить insecure registry. */
  insecure?: boolean;
}

/** Запрос удаления модели. */
export interface RemoveRequest {
  /** Название модели. */
  name: string;
}

/** Элемент списка локальных моделей. */
export interface OllamaModel {
  /** Название модели. */
  name: string;
  /** Размер в байтах. */
  size: number;
  /** Дата последнего изменения. */
  modified_at: string;
  /** Дайджест артефакта. */
  digest?: string;
  /** Детали формата и квантизации. */
  details?: {
    format: string;
    parameter_size: string;
    quantization_level: string;
  };
}

/** Ответ `model.list`. */
export interface ListModelsResponse {
  /** Массив локальных моделей. */
  models: OllamaModel[];
}

/** Унарный результат install/remove. */
export interface UnarySuccess {
  /** Успешность операции. */
  success: boolean;
}

/** Прогресс установки модели. */
export interface InstallProgress {
  /** Статус операции. */
  status: 'downloading' | 'verifying' | 'writing' | 'complete' | 'error';
  /** Название модели. */
  name: string;
  /** Загружено байт. */
  size?: number;
  /** Полный размер. */
  total?: number;
  /** Дайджест слоя. */
  digest?: string;
  /** Сообщение об ошибке. */
  error?: string;
}

/** Запрос `catalog.get`. */
export interface GetCatalogRequest {
  /** Принудительно обновить снимок каталога. */
  forceRefresh?: boolean;
}

/** Фильтры `catalog.search` (camelCase JSON ядра). */
export interface CatalogFilters {
  search?: string;
  type?: string;
  localStatus?: string;
  minSize?: number;
  maxSize?: number;
  category?: string;
  tags?: string[];
  languages?: string[];
  architecture?: string;
  format?: string;
  license?: string;
  author?: string;
  minRating?: number;
  minDownloads?: number;
  recommendedOnly?: boolean;
  availableOnly?: boolean;
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
  offset?: number;
}

/** Карточка модели каталога. */
export interface OllamaModelInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  version?: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  type: string;
  format: string;
  parameterSize: string;
  quantizationLevel: string;
  digest?: string;
  tags?: string[];
  compatibilityStatus?: string;
  compatibilityMessages?: string[];
}

/** Снимок каталога. */
export interface ModelCatalog {
  ollama: OllamaModelInfo[];
  totalCount: number;
  lastUpdated: string;
}

/** Запрос `catalog.getModelInfo`. */
export interface GetModelInfoRequest {
  modelName: string;
}

/** Ссылка на модель в чате. */
export interface ChatModelRef {
  name: string;
  version?: string;
  provider?: string;
}

/** Настройки генерации чата. */
export interface GenerationSettings {
  temperature?: number;
  maxTokens?: number;
  parameters?: Record<string, unknown>;
}

/** Сообщение чата. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: ChatModelRef;
  context?: {
    previousMessages?: string[];
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

/** Полные данные чата. */
export interface ChatData {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  defaultModel: ChatModelRef;
  context?: {
    systemPrompt?: string;
    generationSettings?: GenerationSettings;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

/** Элемент списка чатов. */
export interface ChatFile {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  defaultModel: ChatModelRef;
  lastMessage?: {
    role: ChatMessage['role'];
    content: string;
    timestamp: string;
  };
  fileSize?: number;
  isLocked?: boolean;
  metadata?: Record<string, unknown>;
}

/** Запрос создания чата. */
export interface CreateChatRequest {
  title: string;
  defaultModel: ChatModelRef;
  systemPrompt?: string;
  generationSettings?: GenerationSettings;
  metadata?: Record<string, unknown>;
}

/** Запрос чтения чата. */
export interface GetChatRequest {
  chatId: string;
  includeMessages?: boolean;
  messageLimit?: number;
  messageOffset?: number;
}

/** Запрос обновления чата. */
export interface UpdateChatRequest {
  chatId: string;
  title?: string;
  defaultModel?: ChatModelRef;
  systemPrompt?: string;
  generationSettings?: GenerationSettings;
  metadata?: Record<string, unknown>;
}

/** Запрос удаления чата. */
export interface DeleteChatRequest {
  chatId: string;
  createBackup?: boolean;
  confirmed?: boolean;
}

/** Запрос списка чатов. */
export interface ListChatsRequest {
  limit?: number;
  offset?: number;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  searchQuery?: string;
  modelFilter?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'messageCount';
  sortOrder?: 'asc' | 'desc';
}

/** Запрос добавления сообщения. */
export interface AddMessageRequest {
  chatId: string;
  role: ChatMessage['role'];
  content: string;
  model?: ChatModelRef;
  context?: ChatMessage['context'];
  metadata?: Record<string, unknown>;
}

/** Ответ удаления чата. */
export interface DeleteChatResponse {
  deletedChatId: string;
}

/** Ответ списка чатов. */
export interface ListChatsResponse {
  chats: ChatFile[];
  totalCount: number;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/** Ответ `addMessage`. */
export interface AddMessageResponse {
  message: ChatMessage;
  updatedChat: ChatData;
}

/** Envelope Electron IPC (только внутри ElectronTransport). */
export interface IpcResponseEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  id?: string;
}

/** 14 операций MVP + 2 подписки на прогресс. */
export const MVP_MODEL_METHODS = [
  'generate',
  'stop',
  'install',
  'remove',
  'list',
  'onGenerateProgress',
  'onInstallProgress',
] as const;

export const MVP_CATALOG_METHODS = ['get', 'search', 'getModelInfo'] as const;

export const MVP_CHAT_METHODS = [
  'create',
  'get',
  'update',
  'delete',
  'list',
  'addMessage',
] as const;

/** Имена Tauri commands из `domain/contract.rs`. */
export const TAURI_COMMANDS = [
  'model_generate',
  'model_stop',
  'model_install',
  'model_remove',
  'model_list',
  'catalog_get',
  'catalog_search',
  'catalog_get_model_info',
  'chat_create',
  'chat_get',
  'chat_update',
  'chat_delete',
  'chat_list',
  'chat_add_message',
] as const;

/** IPC-имена progress-событий ядра. */
export const TAURI_EVENTS = [
  'model:generate-progress',
  'model:install-progress',
] as const;

export const DEFAULT_PROVIDER_ID = 'ollama';
export const DEFAULT_PROVIDER_URL = 'http://127.0.0.1:11434';
