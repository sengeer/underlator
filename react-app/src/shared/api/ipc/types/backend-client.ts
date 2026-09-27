/**
 * @module BackendClientTypes
 * DTO и фасады MVP BackendClient (`model` / `catalog` / `chat`) без envelope IPC.
 */

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
  /** Идентификатор провайдера (override manage-models). */
  id?: string;
  /** Base URL провайдера из UI. */
  url?: string;
}

/** Запрос удаления модели. */
export interface RemoveRequest {
  /** Название модели. */
  name: string;
  /** Идентификатор провайдера (override manage-models). */
  id?: string;
  /** Base URL провайдера из UI. */
  url?: string;
}

/** Запрос `model.list` с опциональным override провайдера. */
export interface ListModelsRequest {
  /** Идентификатор провайдера (override manage-models). */
  id?: string;
  /** Base URL провайдера из UI. */
  url?: string;
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
  /** Идентификатор провайдера для локального merge. */
  id?: string;
  /** Base URL из UI для локального inventory. */
  url?: string;
}

/** Фильтры `catalog.search` (camelCase JSON ядра). */
export interface CatalogFilters {
  /** Текстовый поиск. */
  search?: string;
  /** Тип модели. */
  type?: string;
  /** Локальный статус. */
  localStatus?: string;
  /** Минимальный размер. */
  minSize?: number;
  /** Максимальный размер. */
  maxSize?: number;
  /** Категория. */
  category?: string;
  /** Теги. */
  tags?: string[];
  /** Языки. */
  languages?: string[];
  /** Архитектура. */
  architecture?: string;
  /** Формат. */
  format?: string;
  /** Лицензия. */
  license?: string;
  /** Автор. */
  author?: string;
  /** Минимальный рейтинг. */
  minRating?: number;
  /** Минимальное число загрузок. */
  minDownloads?: number;
  /** Только рекомендованные. */
  recommendedOnly?: boolean;
  /** Только доступные. */
  availableOnly?: boolean;
  /** Поле сортировки. */
  sortBy?: string;
  /** Направление сортировки. */
  sortOrder?: string;
  /** Лимит выдачи. */
  limit?: number;
  /** Смещение выдачи. */
  offset?: number;
  /** Идентификатор провайдера для локального merge. */
  id?: string;
  /** Base URL из UI для локального inventory. */
  url?: string;
}

/** Карточка модели каталога. */
export interface OllamaModelInfo {
  /** Идентификатор карточки. */
  id: string;
  /** Служебное имя модели. */
  name: string;
  /** Отображаемое имя. */
  displayName: string;
  /** Описание. */
  description?: string;
  /** Версия. */
  version?: string;
  /** Размер в байтах. */
  size: number;
  /** Дата создания. */
  createdAt: string;
  /** Дата изменения. */
  modifiedAt: string;
  /** Тип модели. */
  type: string;
  /** Формат. */
  format: string;
  /** Размер параметров. */
  parameterSize: string;
  /** Уровень квантизации. */
  quantizationLevel: string;
  /** Дайджест. */
  digest?: string;
  /** Теги. */
  tags?: string[];
  /** Статус совместимости. */
  compatibilityStatus?: string;
  /** Сообщения совместимости. */
  compatibilityMessages?: string[];
}

/** Снимок каталога. */
export interface ModelCatalog {
  /** Карточки Ollama. */
  ollama: OllamaModelInfo[];
  /** Общее число записей. */
  totalCount: number;
  /** Время последнего обновления. */
  lastUpdated: string;
}

/** Запрос `catalog.getModelInfo`. */
export interface GetModelInfoRequest {
  /** Имя модели. */
  modelName: string;
  /** Идентификатор провайдера для локального merge. */
  id?: string;
  /** Base URL из UI для локального inventory. */
  url?: string;
}

/** Ссылка на модель в чате. */
export interface ChatModelRef {
  /** Название модели. */
  name: string;
  /** Версия модели. */
  version?: string;
  /** Провайдер модели. */
  provider?: string;
}

/** Настройки генерации чата. */
export interface GenerationSettings {
  /** Температура. */
  temperature?: number;
  /** Максимум токенов. */
  maxTokens?: number;
  /** Дополнительные параметры провайдера. */
  parameters?: Record<string, unknown>;
}

/** Сообщение чата. */
export interface ChatMessage {
  /** Идентификатор сообщения. */
  id: string;
  /** Роль отправителя. */
  role: 'user' | 'assistant' | 'system';
  /** Текст сообщения. */
  content: string;
  /** Временная метка (ISO). */
  timestamp: string;
  /** Модель, сгенерировавшая ответ. */
  model?: ChatModelRef;
  /** Контекст сообщения. */
  context?: {
    previousMessages?: string[];
    metadata?: Record<string, unknown>;
  };
  /** Метаданные сообщения. */
  metadata?: Record<string, unknown>;
}

/** Полные данные чата. */
export interface ChatData {
  /** Идентификатор чата. */
  id: string;
  /** Заголовок. */
  title: string;
  /** Сообщения. */
  messages: ChatMessage[];
  /** Время создания. */
  createdAt: string;
  /** Время обновления. */
  updatedAt: string;
  /** Модель по умолчанию. */
  defaultModel: ChatModelRef;
  /** Контекст чата. */
  context?: {
    systemPrompt?: string;
    generationSettings?: GenerationSettings;
    metadata?: Record<string, unknown>;
  };
  /** Метаданные чата. */
  metadata?: Record<string, unknown>;
}

/** Элемент списка чатов. */
export interface ChatFile {
  /** Идентификатор чата. */
  id: string;
  /** Заголовок. */
  title: string;
  /** Число сообщений. */
  messageCount: number;
  /** Время создания. */
  createdAt: string;
  /** Время обновления. */
  updatedAt: string;
  /** Модель по умолчанию. */
  defaultModel: ChatModelRef;
  /** Последнее сообщение. */
  lastMessage?: {
    role: ChatMessage['role'];
    content: string;
    timestamp: string;
  };
  /** Размер файла на диске. */
  fileSize?: number;
  /** Чат заблокирован. */
  isLocked?: boolean;
  /** Метаданные. */
  metadata?: Record<string, unknown>;
}

/** Запрос создания чата. */
export interface CreateChatRequest {
  /** Заголовок. */
  title: string;
  /** Модель по умолчанию. */
  defaultModel: ChatModelRef;
  /** Системный промпт. */
  systemPrompt?: string;
  /** Настройки генерации. */
  generationSettings?: GenerationSettings;
  /** Метаданные. */
  metadata?: Record<string, unknown>;
}

/** Запрос чтения чата. */
export interface GetChatRequest {
  /** Идентификатор чата. */
  chatId: string;
  /** Включать сообщения в ответ. */
  includeMessages?: boolean;
  /** Лимит сообщений. */
  messageLimit?: number;
  /** Смещение сообщений. */
  messageOffset?: number;
}

/** Запрос обновления чата. */
export interface UpdateChatRequest {
  /** Идентификатор чата. */
  chatId: string;
  /** Новый заголовок. */
  title?: string;
  /** Новая модель по умолчанию. */
  defaultModel?: ChatModelRef;
  /** Новый системный промпт. */
  systemPrompt?: string;
  /** Новые настройки генерации. */
  generationSettings?: GenerationSettings;
  /** Новые метаданные. */
  metadata?: Record<string, unknown>;
}

/** Запрос удаления чата. */
export interface DeleteChatRequest {
  /** Идентификатор чата. */
  chatId: string;
  /** Создать backup перед удалением. */
  createBackup?: boolean;
  /** Подтверждение удаления. */
  confirmed?: boolean;
}

/** Запрос списка чатов. */
export interface ListChatsRequest {
  /** Лимит. */
  limit?: number;
  /** Смещение. */
  offset?: number;
  /** Созданы после. */
  createdAfter?: string;
  /** Созданы до. */
  createdBefore?: string;
  /** Обновлены после. */
  updatedAfter?: string;
  /** Обновлены до. */
  updatedBefore?: string;
  /** Поисковый запрос. */
  searchQuery?: string;
  /** Фильтр по модели. */
  modelFilter?: string;
  /** Поле сортировки. */
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'messageCount';
  /** Направление сортировки. */
  sortOrder?: 'asc' | 'desc';
}

/** Запрос добавления сообщения. */
export interface AddMessageRequest {
  /** Идентификатор чата. */
  chatId: string;
  /** Роль сообщения. */
  role: ChatMessage['role'];
  /** Текст. */
  content: string;
  /** Модель. */
  model?: ChatModelRef;
  /** Контекст. */
  context?: ChatMessage['context'];
  /** Метаданные. */
  metadata?: Record<string, unknown>;
}

/** Ответ удаления чата. */
export interface DeleteChatResponse {
  /** Идентификатор удалённого чата. */
  deletedChatId: string;
}

/** Ответ списка чатов. */
export interface ListChatsResponse {
  /** Элементы списка. */
  chats: ChatFile[];
  /** Общее число. */
  totalCount: number;
  /** Пагинация. */
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
  /** Созданное сообщение. */
  message: ChatMessage;
  /** Обновлённый чат. */
  updatedChat: ChatData;
}

/** Фасад `model` (5 операций + 2 подписки). */
export interface ModelApi {
  /**
   * Запускает генерацию текста.
   *
   * @param request - Параметры generate.
   * @param config - Override провайдера.
   * @returns Полный текст ответа.
   */
  generate(
    request: GenerateRequest,
    config?: Partial<ProviderConfig>
  ): Promise<string>;
  /**
   * Останавливает активную генерацию.
   *
   * @returns Завершение без тела.
   */
  stop(): Promise<void>;
  /**
   * Устанавливает модель.
   *
   * @param request - Параметры install.
   * @returns Унарный успех.
   */
  install(request: InstallRequest): Promise<UnarySuccess>;
  /**
   * Удаляет модель.
   *
   * @param request - Параметры remove.
   * @returns Унарный успех.
   */
  remove(request: RemoveRequest): Promise<UnarySuccess>;
  /**
   * Список локальных моделей.
   *
   * @param request - Опциональный override провайдера.
   * @returns Список моделей.
   */
  list(request?: ListModelsRequest): Promise<ListModelsResponse>;
  /**
   * Подписка на chunk generate.
   *
   * @param callback - Обработчик прогресса.
   * @returns Функция отписки.
   */
  onGenerateProgress(
    callback: (progress: GenerateProgress) => void
  ): () => void;
  /**
   * Подписка на прогресс install.
   *
   * @param callback - Обработчик прогресса.
   * @returns Функция отписки.
   */
  onInstallProgress(callback: (progress: InstallProgress) => void): () => void;
}

/** Фасад `catalog`. */
export interface CatalogApi {
  /**
   * Снимок каталога.
   *
   * @param params - Опции get.
   * @returns Каталог моделей.
   */
  get(params?: GetCatalogRequest): Promise<ModelCatalog>;
  /**
   * Поиск по каталогу.
   *
   * @param filters - Фильтры search.
   * @returns Каталог моделей.
   */
  search(filters: CatalogFilters): Promise<ModelCatalog>;
  /**
   * Карточка одной модели.
   *
   * @param params - Имя модели и override провайдера.
   * @returns Карточка или `null`.
   */
  getModelInfo(params: GetModelInfoRequest): Promise<OllamaModelInfo | null>;
}

/** Фасад `chat`. */
export interface ChatApi {
  /**
   * Создаёт чат.
   *
   * @param request - Параметры create.
   * @returns Данные чата.
   */
  create(request: CreateChatRequest): Promise<ChatData>;
  /**
   * Читает чат.
   *
   * @param request - Параметры get.
   * @returns Данные чата.
   */
  get(request: GetChatRequest): Promise<ChatData>;
  /**
   * Обновляет чат.
   *
   * @param request - Параметры update.
   * @returns Данные чата.
   */
  update(request: UpdateChatRequest): Promise<ChatData>;
  /**
   * Удаляет чат.
   *
   * @param request - Параметры delete.
   * @returns Идентификатор удалённого чата.
   */
  delete(request: DeleteChatRequest): Promise<DeleteChatResponse>;
  /**
   * Список чатов.
   *
   * @param request - Фильтры list.
   * @returns Страница чатов.
   */
  list(request?: ListChatsRequest): Promise<ListChatsResponse>;
  /**
   * Добавляет сообщение в чат.
   *
   * @param request - Параметры addMessage.
   * @returns Сообщение и обновлённый чат.
   */
  addMessage(request: AddMessageRequest): Promise<AddMessageResponse>;
}

/**
 * Transport-agnostic клиент MVP preload surface.
 * Успех = тело DTO ядра; ошибка = throw BackendError.
 */
export interface BackendClient {
  /** Фасад model. */
  readonly model: ModelApi;
  /** Фасад catalog. */
  readonly catalog: CatalogApi;
  /** Фасад chat. */
  readonly chat: ChatApi;
}
