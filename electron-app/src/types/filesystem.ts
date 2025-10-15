/**
 * @module FileSystemTypes
 * Универсальные типы для работы с файловой системой.
 * Поддерживает любые типы файлов через конфигурируемые валидаторы.
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
 * Конфигурация универсального FileSystemService.
 */
export interface FileSystemConfig {
  /** Базовый путь для хранения файлов */
  basePath: string;
  /** Максимальный размер файла в байтах */
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
 * Информация о файле.
 */
export interface FileInfo {
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
  /** Тип файла */
  fileType: string;
}

/**
 * Универсальная структура файла.
 */
export interface FileStructure<TMetadata = unknown, TData = unknown> {
  /** Версия формата файла */
  version: string;
  /** Метаданные файла */
  metadata: TMetadata;
  /** Данные файла */
  data: TData;
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
  /** Тип файла */
  fileType: string;
}

/**
 * Статистика файловой системы.
 */
export interface FileSystemStats {
  /** Общее количество файлов */
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
  /** Статистика по типам файлов */
  fileTypeStats: Record<
    string,
    {
      count: number;
      totalSize: number;
    }
  >;
}

/**
 * Конфигурация типа файла.
 */
export interface FileTypeConfig<TMetadata = unknown, TData = unknown> {
  /** Папка для хранения файлов этого типа */
  folder: string;
  /** Расширение файлов этого типа */
  extension: string;
  /** Валидатор структуры файла */
  validator: (data: unknown) => data is FileStructure<TMetadata, TData>;
  /** Максимальный размер файла для этого типа */
  maxFileSize?: number;
  /** Максимальное количество файлов этого типа */
  maxFiles?: number;
}

/**
 * Результат валидации файла.
 */
export interface FileValidationResult {
  /** Валидность файла */
  valid: boolean;
  /** Сообщение об ошибке */
  error?: string;
  /** Предупреждения */
  warnings?: string[];
}

/**
 * Опции для операций с файлами.
 */
export interface FileOperationOptions {
  /** Создать резервную копию перед операцией */
  createBackup?: boolean;
  /** Принудительно разблокировать файл */
  forceUnlock?: boolean;
  /** Валидировать данные перед записью */
  validate?: boolean;
  /** Логировать операцию */
  logOperation?: boolean;
}

/**
 * Параметры для поиска файлов.
 */
export interface FileSearchParams {
  /** Тип файла для поиска */
  fileType?: string;
  /** Паттерн имени файла */
  namePattern?: string;
  /** Минимальный размер файла */
  minSize?: number;
  /** Максимальный размер файла */
  maxSize?: number;
  /** Дата создания от */
  createdAfter?: string;
  /** Дата создания до */
  createdBefore?: string;
  /** Дата изменения от */
  modifiedAfter?: string;
  /** Дата изменения до */
  modifiedBefore?: string;
  /** Только заблокированные файлы */
  lockedOnly?: boolean;
  /** Только разблокированные файлы */
  unlockedOnly?: boolean;
  /** Максимальное количество файлов для загрузки */
  limit?: number;
  /** Смещение для пагинации */
  offset?: number;
}

/**
 * Результат поиска файлов.
 */
export interface FileSearchResult {
  /** Найденные файлы */
  files: FileInfo[];
  /** Общее количество найденных файлов */
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
}
