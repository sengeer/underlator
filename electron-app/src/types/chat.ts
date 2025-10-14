/**
 * @module ChatTypes
 * Типы для работы с чатами и сообщениями.
 * Определяет интерфейсы для всех операций с чатами и их содержимым.
 */

/**
 * Роль отправителя сообщения в чате.
 * Определяет тип участника диалога.
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
 * Сообщение в чате.
 * Основная единица диалога с поддержкой Markdown контента.
 */
export interface ChatMessage {
  /** Уникальный идентификатор сообщения */
  id: string;
  /** Роль отправителя сообщения */
  role: ChatMessageRole;
  /** Содержимое сообщения в формате Markdown */
  content: string;
  /** Временная метка создания сообщения */
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
 * Данные чата.
 * Полная структура чата с метаданными и сообщениями.
 */
export interface ChatData {
  /** Уникальный идентификатор чата */
  id: string;
  /** Заголовок чата */
  title: string;
  /** Массив сообщений чата */
  messages: ChatMessage[];
  /** Временная метка создания чата */
  createdAt: string;
  /** Временная метка последнего обновления */
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
 * Метаданные файла чата.
 * Информация для отображения в списке чатов без загрузки полного содержимого.
 */
export interface ChatFile {
  /** Уникальный идентификатор чата */
  id: string;
  /** Заголовок чата */
  title: string;
  /** Количество сообщений в чате */
  messageCount: number;
  /** Временная метка создания чата */
  createdAt: string;
  /** Временная метка последнего обновления */
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
    /** Краткое содержимое (первые 100 символов) */
    preview: string;
    /** Временная метка */
    timestamp: string;
  };
  /** Размер файла чата в байтах */
  fileSize?: number;
  /** Статус блокировки файла */
  isLocked?: boolean;
  /** Дополнительные метаданные */
  metadata?: Record<string, unknown>;
}

/**
 * Параметры для создания нового чата.
 * Данные, необходимые для инициализации чата.
 */
export interface CreateChatRequest {
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
 * Параметры для обновления чата.
 * Данные для модификации существующего чата.
 */
export interface UpdateChatRequest {
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
 * Данные для добавления нового сообщения.
 */
export interface AddMessageRequest {
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
 * Параметры для получения чата.
 * Данные для загрузки конкретного чата.
 */
export interface GetChatRequest {
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
 * Параметры для получения списка чатов.
 * Данные для загрузки списка чатов с фильтрацией.
 */
export interface ListChatsRequest {
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
 * Параметры для удаления чата.
 * Данные для удаления чата с подтверждением.
 */
export interface DeleteChatRequest {
  /** ID чата для удаления */
  chatId: string;
  /** Создать резервную копию перед удалением */
  createBackup?: boolean;
  /** Подтверждение удаления */
  confirmed?: boolean;
}

/**
 * Результат операции с чатом.
 * Универсальный тип для результатов всех операций CRUD.
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
 * Специализированный тип для операции создания.
 */
export interface CreateChatResult extends ChatOperationResult<ChatData> {
  /** Созданный чат */
  data?: ChatData;
}

/**
 * Результат получения чата.
 * Специализированный тип для операции чтения.
 */
export interface GetChatResult extends ChatOperationResult<ChatData> {
  /** Полученный чат */
  data?: ChatData;
}

/**
 * Результат обновления чата.
 * Специализированный тип для операции обновления.
 */
export interface UpdateChatResult extends ChatOperationResult<ChatData> {
  /** Обновленный чат */
  data?: ChatData;
}

/**
 * Результат удаления чата.
 * Специализированный тип для операции удаления.
 */
export interface DeleteChatResult extends ChatOperationResult<void> {
  /** ID удаленного чата */
  deletedChatId?: string;
}

/**
 * Результат получения списка чатов.
 * Специализированный тип для операции получения списка.
 */
export interface ListChatsResult extends ChatOperationResult<ChatFile[]> {
  /** Список чатов */
  data?: ChatFile[];
  /** Общее количество чатов */
  totalCount?: number;
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
}

/**
 * Результат добавления сообщения.
 * Специализированный тип для операции добавления сообщения.
 */
export interface AddMessageResult extends ChatOperationResult<ChatMessage> {
  /** Добавленное сообщение */
  data?: ChatMessage;
  /** Обновленный чат */
  updatedChat?: ChatData;
}
