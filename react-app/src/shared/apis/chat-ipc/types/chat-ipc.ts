/**
 * @module ChatIpcTypes
 * Типы для работы с Chat IPC API.
 * Определяет интерфейсы для работы с чатами через IPC.
 */

export type ChatMessageRole = 'user' | 'assistant' | 'system';

/**
 * Статус операции с чатом.
 * Используется для отслеживания состояния операций CRUD.
 */
export type ChatOperationStatus =
  | 'idle'
  | 'loading'
  | 'creating'
  | 'updating'
  | 'deleting'
  | 'success'
  | 'error';

/**
 * Интерфейс сообщения чата.
 * Определяет структуру сообщения в чате с поддержкой различных ролей.
 * Синхронизирован с Electron типами для обеспечения совместимости.
 */
export interface ChatMessage {
  /** Уникальный идентификатор сообщения */
  id: string;
  /** Роль отправителя сообщения */
  role: ChatMessageRole;
  /** Содержимое сообщения в формате Markdown */
  content: string;
  /** Временная метка создания сообщения (ISO строка) */
  timestamp: string;
  /** Информация о модели, использованной для генерации ответа */
  model?: {
    /** Название модели */
    name: string;
    /** Версия модели */
    version?: string;
    /** Провайдер модели */
    provider?: string;
  };
  /** Контекстная информация для понимания сообщения */
  context?: {
    /** Предыдущие сообщения для контекста */
    previousMessages?: string[];
    /** Дополнительные метаданные */
    metadata?: Record<string, unknown>;
  };
  /** Дополнительные метаданные сообщения */
  metadata?: Record<string, unknown>;
}

/**
 * Интерфейс данных чата.
 * Содержит полную информацию о чате включая все сообщения.
 * Синхронизирован с Electron типами для обеспечения совместимости.
 */
export interface ChatData {
  /** Уникальный идентификатор чата */
  id: string;
  /** Заголовок чата */
  title: string;
  /** Массив сообщений чата */
  messages: ChatMessage[];
  /** Временная метка создания чата (ISO строка) */
  createdAt: string;
  /** Временная метка последнего обновления чата (ISO строка) */
  updatedAt: string;
  /** Информация о модели по умолчанию для чата */
  defaultModel: {
    /** Название модели */
    name: string;
    /** Версия модели */
    version?: string;
    /** Провайдер модели */
    provider?: string;
  };
  /** Контекст чата для понимания диалога */
  context?: {
    /** Системный промпт для чата */
    systemPrompt?: string;
    /** Настройки генерации */
    generationSettings?: {
      /** Температура генерации */
      temperature?: number;
      /** Максимальное количество токенов */
      maxTokens?: number;
      /** Дополнительные параметры */
      parameters?: Record<string, unknown>;
    };
    /** Дополнительные метаданные контекста */
    metadata?: Record<string, unknown>;
  };
  /** Дополнительные метаданные чата */
  metadata?: Record<string, unknown>;
}

/**
 * Интерфейс файла чата.
 * Содержит метаданные для отображения в списке чатов без загрузки полного содержимого.
 * Синхронизирован с Electron типами для обеспечения совместимости.
 */
export interface ChatFile {
  /** Уникальный идентификатор чата */
  id: string;
  /** Заголовок чата */
  title: string;
  /** Количество сообщений в чате */
  messageCount: number;
  /** Временная метка создания чата (ISO строка) */
  createdAt: string;
  /** Временная метка последнего обновления чата (ISO строка) */
  updatedAt: string;
  /** Информация о модели по умолчанию */
  defaultModel: {
    /** Название модели */
    name: string;
    /** Версия модели */
    version?: string;
    /** Провайдер модели */
    provider?: string;
  };
  /** Последнее сообщение для предварительного просмотра */
  lastMessage?: {
    /** Роль отправителя */
    role: ChatMessageRole;
    /** Текст сообщения */
    content: string;
    /** Временная метка */
    timestamp: string;
  };
  /** Размер файла чата в байтах */
  fileSize?: number;
  /** Статус блокировки файла */
  isLocked?: boolean;
  /** Дополнительные метаданные чата */
  metadata?: Record<string, unknown>;
}

/**
 * Параметры для создания нового чата.
 * Информация необходимая для создания чата.
 * Синхронизированы с CreateChatRequest из Electron типов.
 */
export interface CreateChatParams {
  /** Заголовок чата */
  title: string;
  /** Информация о модели по умолчанию */
  defaultModel: {
    /** Название модели */
    name: string;
    /** Версия модели */
    version?: string;
    /** Провайдер модели */
    provider?: string;
  };
  /** Системный промпт для чата */
  systemPrompt?: string;
  /** Настройки генерации */
  generationSettings?: {
    /** Температура генерации */
    temperature?: number;
    /** Максимальное количество токенов */
    maxTokens?: number;
    /** Дополнительные параметры */
    parameters?: Record<string, unknown>;
  };
  /** Дополнительные метаданные */
  metadata?: Record<string, unknown>;
}

/**
 * Параметры для получения списка чатов.
 * Поддерживает пагинацию и сортировку.
 * Синхронизированы с ListChatsRequest из Electron типов.
 */
export interface ListChatsParams {
  /** Максимальное количество чатов для загрузки */
  limit?: number;
  /** Смещение для пагинации */
  offset?: number;
  /** Фильтр по дате создания (от) */
  createdAfter?: string;
  /** Фильтр по дате создания (до) */
  createdBefore?: string;
  /** Фильтр по дате обновления (от) */
  updatedAfter?: string;
  /** Фильтр по дате обновления (до) */
  updatedBefore?: string;
  /** Поиск по заголовку чата */
  searchQuery?: string;
  /** Фильтр по модели */
  modelFilter?: string;
  /** Сортировка результатов */
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'messageCount';
  /** Направление сортировки */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Параметры для получения конкретного чата.
 * Информация для загрузки полного содержимого чата.
 * Синхронизированы с GetChatRequest из Electron типов.
 */
export interface GetChatParams {
  /** ID чата для получения */
  chatId: string;
  /** Включить полную информацию о сообщениях */
  includeMessages?: boolean;
  /** Максимальное количество сообщений для загрузки */
  messageLimit?: number;
  /** Смещение для пагинации сообщений */
  messageOffset?: number;
}

/**
 * Параметры для обновления чата.
 * Информация для обновления существующего чата.
 * Синхронизированы с UpdateChatRequest из Electron типов.
 */
export interface UpdateChatParams {
  /** ID чата для обновления */
  chatId: string;
  /** Новый заголовок чата (опционально) */
  title?: string;
  /** Новая информация о модели по умолчанию (опционально) */
  defaultModel?: {
    /** Название модели */
    name: string;
    /** Версия модели */
    version?: string;
    /** Провайдер модели */
    provider?: string;
  };
  /** Новый системный промпт (опционально) */
  systemPrompt?: string;
  /** Новые настройки генерации (опционально) */
  generationSettings?: {
    /** Температура генерации */
    temperature?: number;
    /** Максимальное количество токенов */
    maxTokens?: number;
    /** Дополнительные параметры */
    parameters?: Record<string, unknown>;
  };
  /** Дополнительные метаданные */
  metadata?: Record<string, unknown>;
}

/**
 * Параметры для добавления сообщения в чат.
 * Информация для добавления нового сообщения.
 * Синхронизированы с AddMessageRequest из Electron типов.
 */
export interface AddMessageParams {
  /** ID чата */
  chatId: string;
  /** Роль отправителя */
  role: ChatMessageRole;
  /** Содержимое сообщения */
  content: string;
  /** Информация о модели (для ответов ассистента) */
  model?: {
    /** Название модели */
    name: string;
    /** Версия модели */
    version?: string;
    /** Провайдер модели */
    provider?: string;
  };
  /** Контекстная информация */
  context?: {
    /** Предыдущие сообщения для контекста */
    previousMessages?: string[];
    /** Дополнительные метаданные */
    metadata?: Record<string, unknown>;
  };
  /** Дополнительные метаданные сообщения */
  metadata?: Record<string, unknown>;
}

/**
 * Параметры для удаления чата.
 * Информация для удаления чата с возможностью создания резервной копии.
 * Синхронизированы с DeleteChatRequest из Electron типов.
 */
export interface DeleteChatParams {
  /** ID чата для удаления */
  chatId: string;
  /** Создать резервную копию перед удалением */
  createBackup?: boolean;
  /** Подтверждение удаления */
  confirmed?: boolean;
}

/**
 * Результат операции с чатами.
 * Стандартизированный ответ для всех операций с чатами.
 * Синхронизирован с ChatOperationResult из Electron типов.
 */
export interface ChatOperationResult<T = unknown> {
  /** Успешность операции */
  success: boolean;
  /** Результат операции */
  data?: T;
  /** Ошибка при выполнении */
  error?: string;
  /** Статус операции */
  status: ChatOperationStatus;
  /** Временная метка операции */
  timestamp: string;
}

/**
 * Результат создания чата.
 * Содержит информацию о созданном чате.
 * Синхронизирован с CreateChatResult из Electron типов.
 */
export interface CreateChatResult extends ChatOperationResult<ChatData> {
  /** Созданный чат */
  data?: ChatData;
}

/**
 * Результат получения списка чатов.
 * Содержит список чатов с метаданными.
 * Синхронизирован с ListChatsResult из Electron типов.
 */
export interface ListChatsResult
  extends ChatOperationResult<{
    /** Список чатов */
    chats: ChatFile[];
    /** Общее количество чатов */
    totalCount: number;
    /** Информация о пагинации */
    pagination?: {
      /** Текущая страница */
      page: number;
      /** Размер страницы */
      pageSize: number;
      /** Общее количество страниц */
      totalPages: number;
      /** Есть ли следующая страница */
      hasNext: boolean;
      /** Есть ли предыдущая страница */
      hasPrevious: boolean;
    };
  }> {
  /** Список чатов */
  data?: {
    /** Список чатов */
    chats: ChatFile[];
    /** Общее количество чатов */
    totalCount: number;
    /** Информация о пагинации */
    pagination?: {
      /** Текущая страница */
      page: number;
      /** Размер страницы */
      pageSize: number;
      /** Общее количество страниц */
      totalPages: number;
      /** Есть ли следующая страница */
      hasNext: boolean;
      /** Есть ли предыдущая страница */
      hasPrevious: boolean;
    };
  };
}

/**
 * Результат получения чата.
 * Содержит полную информацию о чате.
 * Синхронизирован с GetChatResult из Electron типов.
 */
export interface GetChatResult extends ChatOperationResult<ChatData> {
  /** Полученный чат */
  data?: ChatData;
}

/**
 * Результат обновления чата.
 * Содержит информацию об обновленном чате.
 * Синхронизирован с UpdateChatResult из Electron типов.
 */
export interface UpdateChatResult extends ChatOperationResult<ChatData> {
  /** Обновленный чат */
  data?: ChatData;
}

/**
 * Результат добавления сообщения.
 * Содержит информацию о добавленном сообщении.
 * Синхронизирован с AddMessageResult из Electron типов.
 */
export interface AddMessageResult
  extends ChatOperationResult<{
    /** Добавленное сообщение */
    message: ChatMessage;
    /** Обновленный чат */
    updatedChat?: ChatData;
  }> {
  /** Добавленное сообщение */
  data?: {
    /** Добавленное сообщение */
    message: ChatMessage;
    /** Обновленный чат */
    updatedChat?: ChatData;
  };
}

/**
 * Результат удаления чата.
 * Содержит информацию об удаленном чате.
 * Синхронизирован с DeleteChatResult из Electron типов.
 */
export interface DeleteChatResult extends ChatOperationResult<void> {
  /** ID удаленного чата */
  deletedChatId?: string;
}

/**
 * Конфигурация для API клиента.
 * Настройки для работы с Chat Electron API.
 */
export interface ChatApiConfig {
  /** Таймаут для операций в миллисекундах */
  timeout?: number;
  /** Максимальное количество попыток при ошибках */
  maxRetries?: number;
  /** Задержка между попытками в миллисекундах */
  retryDelay?: number;
  /** Включить логирование операций */
  enableLogging?: boolean;
}
