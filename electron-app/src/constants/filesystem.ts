/**
 * @module FileSystemConstants
 * Константы для работы с файловой системой чатов.
 */

import { FileSystemConfig } from '../types/filesystem';
import { isDev } from '../main';
import { app } from 'electron';
import * as path from 'path';

/**
 * Конфигурация по умолчанию для FileSystemService.
 */
export const DEFAULT_FILESYSTEM_CONFIG: FileSystemConfig = {
  basePath: isDev ? app.getPath('userData') : path.dirname(app.getPath('exe')),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  lockTimeout: 5 * 60 * 1000, // 5 минут
  enableBackup: true,
  maxBackups: 5,
  backupRetentionTime: 7 * 24 * 60 * 60 * 1000, // 7 дней
};

/**
 * Имена папок и файлов.
 */
export const FILESYSTEM_PATHS = {
  CHATS_FOLDER: 'chats',
  BACKUP_FOLDER: 'backups',
  TEMP_FOLDER: 'temp',
  LOCK_FOLDER: 'locks',
} as const;

/**
 * Расширения файлов.
 */
export const FILE_EXTENSIONS = {
  CHAT_FILE: '.chat.json',
  BACKUP_FILE: '.backup.json',
  LOCK_FILE: '.lock',
  TEMP_FILE: '.tmp',
} as const;

/**
 * Версии формата файлов.
 */
export const FILE_FORMAT_VERSIONS = {
  CURRENT: '1.0.0',
  SUPPORTED: ['1.0.0'],
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
} as const;

/**
 * Настройки валидации.
 */
export const VALIDATION_CONFIG = {
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
} as const;
