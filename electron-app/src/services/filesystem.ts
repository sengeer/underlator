/**
 * @module FileSystemService
 * Сервис для безопасного управления файлами чатов в Electron main процессе.
 * Реализует атомарные операции, резервное копирование и блокировку файлов.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  DEFAULT_FILESYSTEM_CONFIG,
  FILESYSTEM_PATHS,
  FILE_EXTENSIONS,
  FILE_FORMAT_VERSIONS,
  FILESYSTEM_ERROR_CODES,
  FILESYSTEM_ERROR_MESSAGES,
  VALIDATION_CONFIG,
  LOGGING_CONFIG,
} from '../constants/filesystem';
import type {
  FileSystemConfig,
  FileSystemOperationResult,
  ChatFileInfo,
  ChatFileStructure,
  FileLockStatus,
  BackupInfo,
  FileSystemStats,
} from '../types/filesystem';

/**
 * @class FileSystemService
 *
 * Сервис для безопасного управления файлами чатов.
 * Обеспечивает атомарные операции, валидацию, резервное копирование и блокировку файлов.
 */
export class FileSystemService {
  private config: FileSystemConfig;
  private basePath: string;
  private chatsPath: string;
  private backupsPath: string;
  private tempPath: string;
  private locksPath: string;
  private fileLocks: Map<string, FileLockStatus> = new Map();
  private isInitialized: boolean = false;

  /**
   * Создает экземпляр FileSystemService.
   *
   * @param config - Конфигурация сервиса.
   */
  constructor(config?: Partial<FileSystemConfig>) {
    this.config = {
      ...DEFAULT_FILESYSTEM_CONFIG,
      ...config,
    };

    // Устанавливает базовый путь в userData
    this.basePath = this.config.basePath;
    this.chatsPath = path.join(this.basePath, FILESYSTEM_PATHS.CHATS_FOLDER);
    this.backupsPath = path.join(this.basePath, FILESYSTEM_PATHS.BACKUP_FOLDER);
    this.tempPath = path.join(this.basePath, FILESYSTEM_PATHS.TEMP_FOLDER);
    this.locksPath = path.join(this.basePath, FILESYSTEM_PATHS.LOCK_FOLDER);
  }

  /**
   * Инициализирует FileSystemService.
   * Создает необходимые папки и проверяет доступность файловой системы.
   *
   * @returns Promise с результатом инициализации.
   */
  async initialize(): Promise<FileSystemOperationResult<void>> {
    if (this.isInitialized) {
      return {
        success: true,
        status: 'success',
      };
    }

    try {
      console.log('🔄 Initializing FileSystemService...');

      // Создает необходимые папки
      await this.createDirectories();

      // Проверяет доступность файловой системы
      await this.checkFileSystemAccess();

      // Очищает устаревшие блокировки
      await this.cleanupExpiredLocks();

      // Очищает старые резервные копии
      await this.cleanupOldBackups();

      this.isInitialized = true;
      console.log('✅ FileSystemService initialized successfully');

      return {
        success: true,
        status: 'success',
      };
    } catch (error) {
      console.error('❌ Error initializing FileSystemService:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * Создает необходимые директории.
   */
  private async createDirectories(): Promise<void> {
    const directories = [
      this.chatsPath,
      this.backupsPath,
      this.tempPath,
      this.locksPath,
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      } catch (error) {
        console.error(`❌ Failed to create directory ${dir}:`, error);
        throw error;
      }
    }
  }

  /**
   * Проверяет доступность файловой системы.
   */
  private async checkFileSystemAccess(): Promise<void> {
    try {
      // Проверяет возможность записи в базовую папку
      const testFile = path.join(this.basePath, '.test-write');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      console.log('✅ File system access verified');
    } catch (error) {
      console.error('❌ File system access check failed:', error);
      throw new Error('File system is not accessible');
    }
  }

  /**
   * Читает файл чата.
   *
   * @param fileName - Имя файла чата.
   * @returns Promise с содержимым файла.
   */
  async readChatFile(
    fileName: string
  ): Promise<FileSystemOperationResult<ChatFileStructure>> {
    const context = `readChatFile(${fileName})`;

    try {
      this.logOperation('read', context);

      // Валидирует имя файла для предотвращения path traversal
      const fileNameValidation = this.validateFileName(fileName);
      if (!fileNameValidation.valid) {
        return {
          success: false,
          error: fileNameValidation.error,
          status: 'error',
        };
      }

      // Проверяет блокировку файла
      const lockStatus = await this.checkFileLock(fileName);
      if (lockStatus.isLocked) {
        return {
          success: false,
          error: FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_LOCKED],
          status: 'error',
        };
      }

      const filePath = path.join(this.chatsPath, fileName);

      // Проверяет существование файла
      try {
        await fs.access(filePath);
      } catch {
        return {
          success: false,
          error:
            FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_NOT_FOUND],
          status: 'error',
        };
      }

      // Читает файл
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Проверяет размер файла
      if (fileContent.length > this.config.maxFileSize) {
        return {
          success: false,
          error:
            FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_TOO_LARGE],
          status: 'error',
        };
      }

      // Парсит и валидируем JSON
      const chatData = JSON.parse(fileContent);
      const validationResult = await this.validateChatFileStructure(chatData);

      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
          status: 'error',
        };
      }

      console.log(`✅ Chat file read successfully: ${fileName}`);
      return {
        success: true,
        data: chatData,
        status: 'success',
      };
    } catch (error) {
      console.error(`❌ Error reading chat file ${fileName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * Записывает файл чата с атомарной операцией.
   *
   * @param fileName - Имя файла чата.
   * @param chatData - Данные чата для записи.
   * @returns Promise с результатом записи.
   */
  async writeChatFile(
    fileName: string,
    chatData: ChatFileStructure
  ): Promise<FileSystemOperationResult<void>> {
    const context = `writeChatFile(${fileName})`;

    try {
      this.logOperation('write', context);

      // Валидирует имя файла для предотвращения path traversal
      const fileNameValidation = this.validateFileName(fileName);
      if (!fileNameValidation.valid) {
        return {
          success: false,
          error: fileNameValidation.error,
          status: 'error',
        };
      }

      // Блокирует файл
      const lockResult = await this.lockFile(fileName);
      if (!lockResult.success) {
        return lockResult;
      }

      try {
        // Валидирует данные перед записью
        const validationResult = await this.validateChatFileStructure(chatData);
        if (!validationResult.success) {
          return {
            success: false,
            error: validationResult.error,
            status: 'error',
          };
        }

        // Создает резервную копию если файл существует
        const filePath = path.join(this.chatsPath, fileName);
        const fileExists = await this.fileExists(filePath);

        if (fileExists && this.config.enableBackup) {
          await this.createBackup(fileName);
        }

        // Выполняет атомарную запись через временный файл
        await this.atomicWrite(filePath, chatData);

        console.log(`✅ Chat file written successfully: ${fileName}`);
        return {
          success: true,
          status: 'success',
        };
      } finally {
        // Разблокирует файл
        await this.unlockFile(fileName);
      }
    } catch (error) {
      console.error(`❌ Error writing chat file ${fileName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * Удаляет файл чата.
   *
   * @param fileName - Имя файла чата.
   * @returns Promise с результатом удаления.
   */
  async deleteChatFile(
    fileName: string
  ): Promise<FileSystemOperationResult<void>> {
    const context = `deleteChatFile(${fileName})`;

    try {
      this.logOperation('delete', context);

      // Валидирует имя файла для предотвращения path traversal
      const fileNameValidation = this.validateFileName(fileName);
      if (!fileNameValidation.valid) {
        return {
          success: false,
          error: fileNameValidation.error,
          status: 'error',
        };
      }

      // Проверяет блокировку файла
      const lockStatus = await this.checkFileLock(fileName);
      if (lockStatus.isLocked) {
        return {
          success: false,
          error: FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_LOCKED],
          status: 'error',
        };
      }

      const filePath = path.join(this.chatsPath, fileName);

      // Проверяет существование файла
      if (!(await this.fileExists(filePath))) {
        return {
          success: false,
          error:
            FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_NOT_FOUND],
          status: 'error',
        };
      }

      // Создает резервную копию перед удалением
      if (this.config.enableBackup) {
        await this.createBackup(fileName);
      }

      // Удаляет файл
      await fs.unlink(filePath);

      console.log(`✅ Chat file deleted successfully: ${fileName}`);
      return {
        success: true,
        status: 'success',
      };
    } catch (error) {
      console.error(`❌ Error deleting chat file ${fileName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * Получает список файлов чатов.
   *
   * @returns Promise со списком файлов чатов.
   */
  async listChatFiles(): Promise<FileSystemOperationResult<ChatFileInfo[]>> {
    const context = 'listChatFiles';

    try {
      this.logOperation('read', context);

      const files = await fs.readdir(this.chatsPath);
      const chatFiles: ChatFileInfo[] = [];

      for (const file of files) {
        if (file.endsWith(FILE_EXTENSIONS.CHAT_FILE)) {
          const filePath = path.join(this.chatsPath, file);
          const stats = await fs.stat(filePath);
          const lockStatus = await this.checkFileLock(file);

          chatFiles.push({
            fileName: file,
            filePath,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            isLocked: lockStatus.isLocked,
            lockOwner: lockStatus.owner,
          });
        }
      }

      // Сортирует по дате изменения (новые сначала)
      chatFiles.sort(
        (a, b) =>
          new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
      );

      console.log(`✅ Listed ${chatFiles.length} chat files`);
      return {
        success: true,
        data: chatFiles,
        status: 'success',
      };
    } catch (error) {
      console.error('❌ Error listing chat files:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * Получает статистику файловой системы.
   *
   * @returns Promise со статистикой.
   */
  async getFileSystemStats(): Promise<
    FileSystemOperationResult<FileSystemStats>
  > {
    const context = 'getFileSystemStats';

    try {
      this.logOperation('read', context);

      const chatFiles = await this.listChatFiles();
      if (!chatFiles.success || !chatFiles.data) {
        return {
          success: false,
          error: 'Failed to list chat files',
          status: 'error',
        };
      }

      const totalSize = chatFiles.data.reduce(
        (sum, file) => sum + file.size,
        0
      );
      const lockedFiles = chatFiles.data.filter(file => file.isLocked).length;

      // Получает информацию о резервных копиях
      const backupFiles = await this.listBackupFiles();
      const backupCount = backupFiles.success
        ? backupFiles.data?.length || 0
        : 0;
      const backupSize =
        backupFiles.success && backupFiles.data
          ? backupFiles.data.reduce((sum, backup) => sum + backup.size, 0)
          : 0;

      const stats: FileSystemStats = {
        totalFiles: chatFiles.data.length,
        totalSize,
        lockedFiles,
        backupCount,
        backupSize,
        lastCleanup: new Date().toISOString(),
      };

      console.log('✅ File system stats retrieved');
      return {
        success: true,
        data: stats,
        status: 'success',
      };
    } catch (error) {
      console.error('❌ Error getting file system stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * Выполняет атомарную запись файла через временный файл.
   *
   * @param filePath - Путь к файлу.
   * @param data - Данные для записи.
   */
  private async atomicWrite(
    filePath: string,
    data: ChatFileStructure
  ): Promise<void> {
    const tempFilePath = path.join(
      this.tempPath,
      `${crypto.randomUUID()}${FILE_EXTENSIONS.TEMP_FILE}`
    );

    try {
      // Записывает во временный файл
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(tempFilePath, jsonData, 'utf-8');

      // Атомарно перемещает временный файл в целевое место
      await fs.rename(tempFilePath, filePath);
    } catch (error) {
      // Очищает временный файл в случае ошибки
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // Игнорирует ошибки очистки
      }
      throw error;
    }
  }

  /**
   * Проверяет существование файла.
   *
   * @param filePath - Путь к файлу.
   * @returns true если файл существует.
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Валидирует структуру файла чата.
   *
   * @param data - Данные для валидации.
   * @returns Результат валидации.
   */
  private async validateChatFileStructure(
    data: unknown
  ): Promise<FileSystemOperationResult<void>> {
    try {
      // Проверяет базовую структуру
      if (!data || typeof data !== 'object') {
        return {
          success: false,
          error: 'Invalid file structure: not an object',
          status: 'error',
        };
      }

      const chatData = data as Record<string, unknown>;

      // Проверяет версию
      const version = chatData['version'] as string;
      if (
        !version ||
        !FILE_FORMAT_VERSIONS.SUPPORTED.includes(
          version as (typeof FILE_FORMAT_VERSIONS.SUPPORTED)[number]
        )
      ) {
        return {
          success: false,
          error: `Unsupported file version: ${chatData['version']}`,
          status: 'error',
        };
      }

      // Проверяет метаданные
      if (!chatData['metadata'] || typeof chatData['metadata'] !== 'object') {
        return {
          success: false,
          error: 'Missing or invalid metadata',
          status: 'error',
        };
      }

      const metadata = chatData['metadata'] as Record<string, unknown>;

      // Проверяет обязательные поля метаданных
      for (const field of VALIDATION_CONFIG.REQUIRED_METADATA_FIELDS) {
        if (!metadata[field]) {
          return {
            success: false,
            error: `Missing required metadata field: ${field}`,
            status: 'error',
          };
        }
      }

      // Проверяет длину названия
      if (
        typeof metadata['title'] === 'string' &&
        metadata['title'].length > VALIDATION_CONFIG.MAX_TITLE_LENGTH
      ) {
        return {
          success: false,
          error: `Title too long: ${metadata['title'].length} characters`,
          status: 'error',
        };
      }

      // Проверяет сообщения
      if (!Array.isArray(chatData['messages'])) {
        return {
          success: false,
          error: 'Messages must be an array',
          status: 'error',
        };
      }

      const messages = chatData['messages'] as unknown[];

      // Проверяет количество сообщений
      if (messages.length > VALIDATION_CONFIG.MAX_MESSAGES_COUNT) {
        return {
          success: false,
          error: `Too many messages: ${messages.length}`,
          status: 'error',
        };
      }

      // Проверяет каждое сообщение
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];

        if (!message || typeof message !== 'object') {
          return {
            success: false,
            error: `Invalid message at index ${i}`,
            status: 'error',
          };
        }

        const messageObj = message as Record<string, unknown>;

        // Проверяет обязательные поля сообщения
        for (const field of VALIDATION_CONFIG.REQUIRED_MESSAGE_FIELDS) {
          if (!messageObj[field]) {
            return {
              success: false,
              error: `Missing required message field: ${field} at index ${i}`,
              status: 'error',
            };
          }
        }

        // Проверяет длину содержимого сообщения
        if (
          typeof messageObj['content'] === 'string' &&
          messageObj['content'].length > VALIDATION_CONFIG.MAX_MESSAGE_LENGTH
        ) {
          return {
            success: false,
            error: `Message content too long at index ${i}: ${messageObj['content'].length} characters`,
            status: 'error',
          };
        }

        // Проверяет тип сообщения
        if (
          !['user', 'assistant', 'system'].includes(
            messageObj['type'] as string
          )
        ) {
          return {
            success: false,
            error: `Invalid message type at index ${i}: ${messageObj['type']}`,
            status: 'error',
          };
        }
      }

      return {
        success: true,
        status: 'success',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation error',
        status: 'error',
      };
    }
  }

  /**
   * Блокирует файл для исключительного доступа.
   *
   * @param fileName - Имя файла.
   * @returns Результат блокировки.
   */
  private async lockFile(
    fileName: string
  ): Promise<FileSystemOperationResult<void>> {
    const lockId = crypto.randomUUID();
    const lockPath = path.join(
      this.locksPath,
      `${fileName}${FILE_EXTENSIONS.LOCK_FILE}`
    );

    try {
      // Проверяет, не заблокирован ли уже файл
      const existingLock = await this.checkFileLock(fileName);
      if (existingLock.isLocked) {
        return {
          success: false,
          error: FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_LOCKED],
          status: 'error',
        };
      }

      // Создает файл блокировки
      const lockData = {
        owner: lockId,
        lockedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.lockTimeout).toISOString(),
      };

      await fs.writeFile(lockPath, JSON.stringify(lockData), 'utf-8');

      // Сохраняет информацию о блокировке в памяти
      this.fileLocks.set(fileName, {
        isLocked: true,
        owner: lockId,
        lockedAt: lockData.lockedAt,
        expiresAt: lockData.expiresAt,
      });

      console.log(`🔒 File locked: ${fileName}`);
      return {
        success: true,
        status: 'success',
      };
    } catch (error) {
      console.error(`❌ Error locking file ${fileName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lock error',
        status: 'error',
      };
    }
  }

  /**
   * Разблокирует файл.
   *
   * @param fileName - Имя файла.
   * @returns Результат разблокировки.
   */
  private async unlockFile(
    fileName: string
  ): Promise<FileSystemOperationResult<void>> {
    const lockPath = path.join(
      this.locksPath,
      `${fileName}${FILE_EXTENSIONS.LOCK_FILE}`
    );

    try {
      // Удаляет файл блокировки
      try {
        await fs.unlink(lockPath);
      } catch {
        // Игнорирует ошибки если файл блокировки не существует
      }

      // Удаляет информацию о блокировке из памяти
      this.fileLocks.delete(fileName);

      console.log(`🔓 File unlocked: ${fileName}`);
      return {
        success: true,
        status: 'success',
      };
    } catch (error) {
      console.error(`❌ Error unlocking file ${fileName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unlock error',
        status: 'error',
      };
    }
  }

  /**
   * Проверяет статус блокировки файла.
   *
   * @param fileName - Имя файла.
   * @returns Статус блокировки.
   */
  private async checkFileLock(fileName: string): Promise<FileLockStatus> {
    // Сначала проверяет в памяти
    const memoryLock = this.fileLocks.get(fileName);
    if (memoryLock) {
      // Проверяет не истекла ли блокировка
      if (
        memoryLock.expiresAt &&
        new Date(memoryLock.expiresAt).getTime() > Date.now()
      ) {
        return memoryLock;
      } else {
        // Удаляет истекшую блокировку
        this.fileLocks.delete(fileName);
      }
    }

    // Проверяет файл блокировки на диске
    const lockPath = path.join(
      this.locksPath,
      `${fileName}${FILE_EXTENSIONS.LOCK_FILE}`
    );

    try {
      const lockContent = await fs.readFile(lockPath, 'utf-8');
      const lockData = JSON.parse(lockContent);

      // Проверяет не истекла ли блокировка
      if (new Date(lockData.expiresAt).getTime() > Date.now()) {
        const lockStatus: FileLockStatus = {
          isLocked: true,
          owner: lockData.owner,
          lockedAt: lockData.lockedAt,
          expiresAt: lockData.expiresAt,
        };

        // Сохраняет в памяти
        this.fileLocks.set(fileName, lockStatus);

        return lockStatus;
      } else {
        // Удаляет истекшую блокировку
        await fs.unlink(lockPath);
      }
    } catch {
      // Файл блокировки не существует или поврежден
    }

    return { isLocked: false };
  }

  /**
   * Создает резервную копию файла.
   *
   * @param fileName - Имя файла.
   * @returns Результат создания резервной копии.
   */
  private async createBackup(
    fileName: string
  ): Promise<FileSystemOperationResult<void>> {
    const context = `createBackup(${fileName})`;

    try {
      this.logOperation('backup', context);

      const sourcePath = path.join(this.chatsPath, fileName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${fileName.replace(FILE_EXTENSIONS.CHAT_FILE, '')}_${timestamp}${FILE_EXTENSIONS.BACKUP_FILE}`;
      const backupPath = path.join(this.backupsPath, backupFileName);

      // Копирует файл
      await fs.copyFile(sourcePath, backupPath);

      // Очищает старые резервные копии
      await this.cleanupOldBackups();

      console.log(`✅ Backup created: ${backupFileName}`);
      return {
        success: true,
        status: 'success',
      };
    } catch (error) {
      console.error(`❌ Error creating backup for ${fileName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backup error',
        status: 'error',
      };
    }
  }

  /**
   * Получает список резервных копий.
   *
   * @returns Promise со списком резервных копий.
   */
  private async listBackupFiles(): Promise<
    FileSystemOperationResult<BackupInfo[]>
  > {
    try {
      const files = await fs.readdir(this.backupsPath);
      const backupFiles: BackupInfo[] = [];

      for (const file of files) {
        if (file.endsWith(FILE_EXTENSIONS.BACKUP_FILE)) {
          const filePath = path.join(this.backupsPath, file);
          const stats = await fs.stat(filePath);

          // Извлекает имя исходного файла
          const originalFile = file
            .replace(/_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/, '')
            .replace(FILE_EXTENSIONS.BACKUP_FILE, FILE_EXTENSIONS.CHAT_FILE);

          backupFiles.push({
            fileName: file,
            filePath,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            originalFile,
          });
        }
      }

      // Сортирует по дате создания (новые сначала)
      backupFiles.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        success: true,
        data: backupFiles,
        status: 'success',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backup listing error',
        status: 'error',
      };
    }
  }

  /**
   * Очищает устаревшие блокировки.
   */
  private async cleanupExpiredLocks(): Promise<void> {
    try {
      const files = await fs.readdir(this.locksPath);

      for (const file of files) {
        if (file.endsWith(FILE_EXTENSIONS.LOCK_FILE)) {
          const lockPath = path.join(this.locksPath, file);

          try {
            const lockContent = await fs.readFile(lockPath, 'utf-8');
            const lockData = JSON.parse(lockContent);

            // Проверяет не истекла ли блокировка
            if (new Date(lockData.expiresAt).getTime() <= Date.now()) {
              await fs.unlink(lockPath);
              console.log(`🧹 Cleaned up expired lock: ${file}`);
            }
          } catch {
            // Удаляет поврежденные файлы блокировки
            await fs.unlink(lockPath);
            console.log(`🧹 Cleaned up corrupted lock: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up expired locks:', error);
    }
  }

  /**
   * Очищает старые резервные копии.
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupFiles = await this.listBackupFiles();
      if (!backupFiles.success || !backupFiles.data) {
        return;
      }

      const cutoffTime = Date.now() - this.config.backupRetentionTime;
      const filesToDelete: string[] = [];

      // Группирует резервные копии по исходному файлу
      const backupsByFile = new Map<string, BackupInfo[]>();
      for (const backup of backupFiles.data) {
        if (!backupsByFile.has(backup.originalFile)) {
          backupsByFile.set(backup.originalFile, []);
        }
        const existingBackups = backupsByFile.get(backup.originalFile);
        if (existingBackups) {
          existingBackups.push(backup);
        }
      }

      // Для каждого исходного файла оставляет только нужное количество резервных копий
      for (const [, backups] of backupsByFile) {
        // Сортирует по дате создания (новые сначала)
        backups.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Удаляет старые резервные копии
        for (let i = this.config.maxBackups; i < backups.length; i++) {
          const backup = backups[i];
          if (backup) {
            filesToDelete.push(backup.filePath);
          }
        }

        // Удаляет резервные копии старше retention time
        for (const backup of backups) {
          if (new Date(backup.createdAt).getTime() < cutoffTime) {
            filesToDelete.push(backup.filePath);
          }
        }
      }

      // Удаляет файлы
      for (const filePath of filesToDelete) {
        try {
          await fs.unlink(filePath);
          console.log(`🧹 Cleaned up old backup: ${path.basename(filePath)}`);
        } catch (error) {
          console.error(`❌ Error deleting backup ${filePath}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up old backups:', error);
    }
  }

  /**
   * Валидирует имя файла для предотвращения path traversal атак.
   *
   * @param fileName - Имя файла для валидации.
   * @returns Результат валидации.
   */
  private validateFileName(fileName: string): {
    valid: boolean;
    error?: string;
  } {
    if (!fileName || typeof fileName !== 'string') {
      return { valid: false, error: 'Invalid file name' };
    }

    // Проверяет на path traversal атаки
    if (
      fileName.includes('..') ||
      fileName.includes('/') ||
      fileName.includes('\\')
    ) {
      return { valid: false, error: 'Path traversal detected' };
    }

    // Проверяет на опасные символы
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      return { valid: false, error: 'Dangerous characters detected' };
    }

    // Проверяет длину имени файла
    if (fileName.length > 255) {
      return { valid: false, error: 'File name too long' };
    }

    // Проверяет что имя файла не пустое после удаления пробелов
    if (fileName.trim().length === 0) {
      return { valid: false, error: 'File name cannot be empty' };
    }

    // Проверяет что файл имеет правильное расширение
    if (!fileName.endsWith(FILE_EXTENSIONS.CHAT_FILE)) {
      return { valid: false, error: 'Invalid file extension' };
    }

    return { valid: true };
  }

  /**
   * Логирует операции файловой системы.
   *
   * @param operation - Тип операции.
   * @param context - Контекст операции.
   */
  private logOperation(operation: string, context: string): void {
    if (LOGGING_CONFIG.ENABLE_VERBOSE_LOGGING) {
      console.log(`📁 [FileSystem] ${operation}: ${context}`);
    }
  }

  /**
   * Получает текущую конфигурацию сервиса.
   *
   * @returns Текущая конфигурация.
   */
  getConfig(): FileSystemConfig {
    return { ...this.config };
  }

  /**
   * Обновляет конфигурацию сервиса.
   *
   * @param newConfig - Новая конфигурация.
   */
  updateConfig(newConfig: Partial<FileSystemConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Проверяет статус инициализации сервиса.
   *
   * @returns true если сервис инициализирован.
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * Создает экземпляр FileSystemService с настройками по умолчанию.
 *
 * @param config - Опциональная конфигурация.
 * @returns Экземпляр FileSystemService.
 */
export function createFileSystemService(
  config?: Partial<FileSystemConfig>
): FileSystemService {
  return new FileSystemService(config);
}
