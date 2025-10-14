/**
 * @module FileSystemTypes
 * Типы для работы с файловой системой чатов.
 */

/**
 * Результат операции файловой системы.
 */
export interface FileSystemOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status: 'success' | 'error' | 'warning';
}

/**
 * Конфигурация FileSystemService.
 */
export interface FileSystemConfig {
  /** Базовый путь для хранения файлов чатов */
  basePath: string;
  /** Максимальный размер файла чата в байтах */
  maxFileSize: number;
  /** Время жизни блокировки файла в миллисекундах */
  lockTimeout: number;
  /** Включить автоматическое резервное копирование */
  enableBackup: boolean;
  /** Максимальное количество резервных копий */
  maxBackups: number;
  /** Время жизни резервных копий в миллисекундах */
  backupRetentionTime: number;
}

/**
 * Информация о файле чата.
 */
export interface ChatFileInfo {
  /** Имя файла */
  fileName: string;
  /** Полный путь к файлу */
  filePath: string;
  /** Размер файла в байтах */
  size: number;
  /** Дата создания */
  createdAt: string;
  /** Дата последнего изменения */
  modifiedAt: string;
  /** Статус блокировки */
  isLocked: boolean;
  /** Владелец блокировки */
  lockOwner?: string;
}

/**
 * Структура файла чата.
 */
export interface ChatFileStructure {
  /** Версия формата файла */
  version: string;
  /** Метаданные чата */
  metadata: {
    /** ID чата */
    id: string;
    /** Название чата */
    title: string;
    /** Дата создания */
    createdAt: string;
    /** Дата последнего обновления */
    updatedAt: string;
    /** Настройки чата */
    settings: {
      /** Используемая модель */
      model: string;
      /** Провайдер */
      provider: string;
      /** Дополнительные параметры */
      parameters?: Record<string, unknown>;
    };
  };
  /** Сообщения чата */
  messages: Array<{
    /** ID сообщения */
    id: string;
    /** Тип сообщения */
    type: 'user' | 'assistant' | 'system';
    /** Содержимое сообщения */
    content: string;
    /** Временная метка */
    timestamp: string;
    /** Дополнительные метаданные */
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * Статус блокировки файла.
 */
export interface FileLockStatus {
  /** Заблокирован ли файл */
  isLocked: boolean;
  /** Владелец блокировки */
  owner?: string;
  /** Время создания блокировки */
  lockedAt?: string;
  /** Время истечения блокировки */
  expiresAt?: string;
}

/**
 * Информация о резервной копии.
 */
export interface BackupInfo {
  /** Имя файла резервной копии */
  fileName: string;
  /** Полный путь к резервной копии */
  filePath: string;
  /** Размер файла */
  size: number;
  /** Дата создания */
  createdAt: string;
  /** Исходный файл */
  originalFile: string;
}

/**
 * Статистика файловой системы.
 */
export interface FileSystemStats {
  /** Общее количество файлов чатов */
  totalFiles: number;
  /** Общий размер всех файлов в байтах */
  totalSize: number;
  /** Количество заблокированных файлов */
  lockedFiles: number;
  /** Количество резервных копий */
  backupCount: number;
  /** Размер резервных копий в байтах */
  backupSize: number;
  /** Время последней очистки */
  lastCleanup?: string;
}
