/**
 * @module FileSystemConstants
 * Константы для работы с файловой системой.
 * Поддерживает любые типы файлов через конфигурируемые настройки.
 */

import { FileSystemConfig } from '../types/filesystem';
import { isDev } from '../main';
import { app } from 'electron';
import * as path from 'path';

/**
 * Конфигурация по умолчанию для универсального FileSystemService.
 */
export const DEFAULT_FILESYSTEM_CONFIG: FileSystemConfig = {
  basePath: isDev ? app.getPath('userData') : path.dirname(app.getPath('exe')),
  maxFileSize: 50 * 1024 * 1024, // 50MB
  lockTimeout: 5 * 60 * 1000, // 5 минут
  enableBackup: true,
  maxBackups: 5,
  backupRetentionTime: 7 * 24 * 60 * 60 * 1000, // 7 дней
};

/**
 * Имена папок для разных типов файлов.
 */
export const FILESYSTEM_PATHS = {
  /** Папка для чатов */
  CHATS_FOLDER: 'chats',
  /** Папка для документов */
  DOCUMENTS_FOLDER: 'documents',
  /** Папка для настроек */
  SETTINGS_FOLDER: 'settings',
  /** Папка для логов */
  LOGS_FOLDER: 'logs',
  /** Папка для резервных копий */
  BACKUP_FOLDER: 'backups',
  /** Папка для временных файлов */
  TEMP_FOLDER: 'temp',
  /** Папка для блокировок */
  LOCK_FOLDER: 'locks',
} as const;

/**
 * Расширения файлов для разных типов.
 */
export const FILE_EXTENSIONS = {
  /** Файлы чатов */
  CHAT_FILE: '.chat.json',
  /** Файлы документов */
  DOCUMENT_FILE: '.doc.json',
  /** Файлы настроек */
  SETTINGS_FILE: '.settings.json',
  /** Файлы логов */
  LOG_FILE: '.log.json',
  /** Резервные копии */
  BACKUP_FILE: '.backup.json',
  /** Блокировки */
  LOCK_FILE: '.lock',
  /** Временные файлы */
  TEMP_FILE: '.tmp',
} as const;

/**
 * Коды ошибок файловой системы.
 */
export const FILESYSTEM_ERROR_CODES = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_LOCKED: 'FILE_LOCKED',
  INVALID_FORMAT: 'INVALID_FORMAT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DISK_FULL: 'DISK_FULL',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BACKUP_FAILED: 'BACKUP_FAILED',
  RESTORE_FAILED: 'RESTORE_FAILED',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  FILE_TYPE_MISMATCH: 'FILE_TYPE_MISMATCH',
  MAX_FILES_EXCEEDED: 'MAX_FILES_EXCEEDED',
} as const;

/**
 * Сообщения об ошибках.
 */
export const FILESYSTEM_ERROR_MESSAGES = {
  [FILESYSTEM_ERROR_CODES.FILE_NOT_FOUND]: 'File not found',
  [FILESYSTEM_ERROR_CODES.FILE_TOO_LARGE]: 'File is too large',
  [FILESYSTEM_ERROR_CODES.FILE_LOCKED]: 'File is locked',
  [FILESYSTEM_ERROR_CODES.INVALID_FORMAT]: 'Invalid file format',
  [FILESYSTEM_ERROR_CODES.PERMISSION_DENIED]: 'Permission denied',
  [FILESYSTEM_ERROR_CODES.DISK_FULL]: 'Not enough disk space',
  [FILESYSTEM_ERROR_CODES.NETWORK_ERROR]: 'Network error',
  [FILESYSTEM_ERROR_CODES.VALIDATION_ERROR]: 'Validation error',
  [FILESYSTEM_ERROR_CODES.BACKUP_FAILED]: 'Failed to create backup',
  [FILESYSTEM_ERROR_CODES.RESTORE_FAILED]: 'Failed to restore file',
  [FILESYSTEM_ERROR_CODES.UNSUPPORTED_FILE_TYPE]: 'Unsupported file type',
  [FILESYSTEM_ERROR_CODES.FILE_TYPE_MISMATCH]: 'File type mismatch',
  [FILESYSTEM_ERROR_CODES.MAX_FILES_EXCEEDED]:
    'Maximum number of files exceeded',
} as const;

/**
 * Настройки валидации для разных типов файлов.
 */
export const VALIDATION_CONFIG = {
  /** Общие настройки */
  GENERAL: {
    /** Максимальная длина имени файла */
    MAX_FILENAME_LENGTH: 255,
    /** Максимальная длина пути */
    MAX_PATH_LENGTH: 4096,
    /** Запрещенные символы в имени файла */
    FORBIDDEN_CHARS: /[<>:"|?*\x00-\x1f]/,
    /** Паттерн для проверки path traversal */
    PATH_TRAVERSAL_PATTERN: /\.\.|\/|\\/,
  },
  /** Настройки для чатов */
  CHAT: {
    /** Максимальная длина названия чата */
    MAX_TITLE_LENGTH: 200,
    /** Максимальная длина содержимого сообщения */
    MAX_MESSAGE_LENGTH: 50000,
    /** Максимальное количество сообщений в чате */
    MAX_MESSAGES_COUNT: 10000,
    /** Обязательные поля в метаданных */
    REQUIRED_METADATA_FIELDS: ['id', 'title', 'createdAt', 'updatedAt'],
    /** Обязательные поля в сообщении */
    REQUIRED_MESSAGE_FIELDS: ['id', 'type', 'content', 'timestamp'],
  },
  /** Настройки для документов */
  DOCUMENT: {
    /** Максимальная длина названия документа */
    MAX_TITLE_LENGTH: 500,
    /** Максимальная длина содержимого документа */
    MAX_CONTENT_LENGTH: 1000000, // 1MB
    /** Обязательные поля в метаданных */
    REQUIRED_METADATA_FIELDS: ['id', 'title', 'createdAt', 'updatedAt'],
  },
  /** Настройки для настроек */
  SETTINGS: {
    /** Максимальная длина названия настройки */
    MAX_TITLE_LENGTH: 100,
    /** Максимальная длина значения настройки */
    MAX_VALUE_LENGTH: 10000,
    /** Обязательные поля в метаданных */
    REQUIRED_METADATA_FIELDS: ['id', 'key', 'createdAt', 'updatedAt'],
  },
} as const;

/**
 * Настройки логирования.
 */
export const LOGGING_CONFIG = {
  /** Включить детальное логирование */
  ENABLE_VERBOSE_LOGGING: true,
  /** Логировать операции чтения */
  LOG_READ_OPERATIONS: false,
  /** Логировать операции записи */
  LOG_WRITE_OPERATIONS: true,
  /** Логировать операции блокировки */
  LOG_LOCK_OPERATIONS: true,
  /** Логировать операции резервного копирования */
  LOG_BACKUP_OPERATIONS: true,
  /** Логировать операции валидации */
  LOG_VALIDATION_OPERATIONS: false,
  /** Логировать операции поиска */
  LOG_SEARCH_OPERATIONS: false,
} as const;

/**
 * Конфигурация типов файлов.
 */
export const FILE_TYPE_CONFIGS = {
  /** Конфигурация для чатов */
  CHAT: {
    folder: FILESYSTEM_PATHS.CHATS_FOLDER,
    extension: FILE_EXTENSIONS.CHAT_FILE,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1000,
    validation: VALIDATION_CONFIG.CHAT,
  },
  /** Конфигурация для документов */
  DOCUMENT: {
    folder: FILESYSTEM_PATHS.DOCUMENTS_FOLDER,
    extension: FILE_EXTENSIONS.DOCUMENT_FILE,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 500,
    validation: VALIDATION_CONFIG.DOCUMENT,
  },
  /** Конфигурация для настроек */
  SETTINGS: {
    folder: FILESYSTEM_PATHS.SETTINGS_FOLDER,
    extension: FILE_EXTENSIONS.SETTINGS_FILE,
    maxFileSize: 1024 * 1024, // 1MB
    maxFiles: 100,
    validation: VALIDATION_CONFIG.SETTINGS,
  },
  /** Конфигурация для логов */
  LOG: {
    folder: FILESYSTEM_PATHS.LOGS_FOLDER,
    extension: FILE_EXTENSIONS.LOG_FILE,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 100,
    validation: VALIDATION_CONFIG.GENERAL,
  },
} as const;

/**
 * Получает конфигурацию для указанного типа файла.
 *
 * @param fileType - Тип файла.
 * @returns Конфигурация типа файла или undefined.
 */
export function getFileTypeConfig(fileType: string) {
  return FILE_TYPE_CONFIGS[
    fileType.toUpperCase() as keyof typeof FILE_TYPE_CONFIGS
  ];
}

/**
 * Проверяет поддерживается ли тип файла.
 *
 * @param fileType - Тип файла.
 * @returns true если тип поддерживается.
 */
export function isFileTypeSupported(fileType: string): boolean {
  return fileType.toUpperCase() in FILE_TYPE_CONFIGS;
}
