/**
 * @module FileSystemChatTypes
 * Специализированные типы для работы с файлами чатов.
 * Определяет структуру файла чата и его метаданные.
 */

/**
 * Структура файла чата.
 * Специализированная структура для файлов чатов.
 */
export interface ChatFileStructure {
  /** Версия формата файла */
  version: string;
  /** Метаданные чата */
  metadata: {
    /** Уникальный идентификатор чата */
    id: string;
    /** Название чата */
    title: string;
    /** Дата создания */
    createdAt: string;
    /** Дата последнего обновления */
    updatedAt: string;
    /** Настройки чата */
    settings: {
      /** Название модели */
      model: string;
      /** Провайдер модели */
      provider: string;
      /** Дополнительные параметры */
      parameters?: Record<string, unknown>;
    };
  };
  /** Сообщения чата */
  messages: Array<{
    /** Уникальный идентификатор сообщения */
    id: string;
    /** Тип сообщения */
    type: 'user' | 'assistant' | 'system';
    /** Содержимое сообщения */
    content: string;
    /** Временная метка */
    timestamp: string;
    /** Метаданные сообщения */
    metadata?: Record<string, unknown>;
  }>;
}
