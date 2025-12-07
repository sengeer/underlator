/**
 * @module FileSystemService
 * Универсальный сервис для безопасного управления файлами в Electron main процессе.
 * Поддерживает любые типы файлов через конфигурируемые валидаторы и настройки.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  DEFAULT_FILESYSTEM_CONFIG,
  FILESYSTEM_PATHS,
  FILE_EXTENSIONS,
  FILESYSTEM_ERROR_CODES,
  FILESYSTEM_ERROR_MESSAGES,
  VALIDATION_CONFIG,
  getFileTypeConfig,
  isFileTypeSupported,
} from '../constants/filesystem';
import { FileValidatorFactory } from '../utils/file-validators';
import { executeWithErrorHandling } from '../utils/error-handler';
import type {
  FileSystemConfig,
  FileSystemOperationResult,
  FileInfo,
  FileStructure,
  FileLockStatus,
  BackupInfo,
  FileSystemStats,
  FileOperationOptions,
  FileSearchParams,
  FileSearchResult,
} from '../types/filesystem';
import type { OperationContext } from '../types/error-handler';

/**
 * @class FileSystemService
 *
 * Универсальный сервис для безопасного управления файлами.
 * Обеспечивает атомарные операции, валидацию, резервное копирование и блокировку файлов
 * для любых типов файлов через конфигурируемые валидаторы.
 */
export class FileSystemService {
  private config: FileSystemConfig;
  private basePath: string;
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

    // Устанавливает базовый путь
    this.basePath = this.config.basePath;
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

      // Создание необходимых папок
      await this.createDirectories();

      // Проверка доступности файловой системы
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
      console.error('Error initializing FileSystemService:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * Читает файл указанного типа.
   *
   * @param fileName - Имя файла.
   * @param fileType - Тип файла.
   * @param options - Опции операции.
   * @returns Promise с содержимым файла.
   */
  async readFile<TMetadata = unknown, TData = unknown>(
    fileName: string,
    fileType: string,
    options: FileOperationOptions = {}
  ): Promise<FileSystemOperationResult<FileStructure<TMetadata, TData>>> {
    const context: OperationContext = {
      module: 'FileSystemService',
      operation: 'readFile',
      details: `${fileName} (${fileType})`,
    };

    return executeWithErrorHandling(
      async () => {
        // Проверяет поддержку типа файла
        if (!isFileTypeSupported(fileType)) {
          throw new Error(
            FILESYSTEM_ERROR_MESSAGES[
              FILESYSTEM_ERROR_CODES.UNSUPPORTED_FILE_TYPE
            ]
          );
        }

        // Валидирует имя файла
        const fileNameValidation = this.validateFileName(fileName, fileType);
        if (!fileNameValidation.valid) {
          throw new Error(fileNameValidation.error);
        }

        // Проверяет блокировку файла
        const lockStatus = await this.checkFileLock(fileName);
        if (lockStatus.isLocked) {
          throw new Error(
            FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_LOCKED]
          );
        }

        const filePath = this.getFilePath(fileName, fileType);

        // Проверяет существование файла
        try {
          await fs.access(filePath);
        } catch {
          throw new Error(
            FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_NOT_FOUND]
          );
        }

        // Читает файл
        const fileContent = await fs.readFile(filePath, 'utf-8');

        // Проверяет размер файла
        const fileTypeConfig = getFileTypeConfig(fileType);
        const maxFileSize =
          fileTypeConfig?.maxFileSize || this.config.maxFileSize;
        if (fileContent.length > maxFileSize) {
          throw new Error(
            FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_TOO_LARGE]
          );
        }

        // Парсит и валидирует JSON
        const fileData = JSON.parse(fileContent);

        if (options.validate !== false) {
          const validationResult = await this.validateFileStructure(
            fileData,
            fileType
          );
          if (!validationResult.valid) {
            throw new Error(validationResult.error);
          }
        }

        console.log(`✅ File read successfully: ${fileName} (${fileType})`);
        return fileData;
      },
      {
        context,
        logOperation: options.logOperation !== false,
        returnErrorAsResult: true,
      }
    ) as Promise<FileSystemOperationResult<FileStructure<TMetadata, TData>>>;
  }

  /**
   * Записывает файл указанного типа с атомарной операцией.
   *
   * @param fileName - Имя файла.
   * @param fileType - Тип файла.
   * @param fileData - Данные файла для записи.
   * @param options - Опции операции.
   * @returns Promise с результатом записи.
   */
  async writeFile<TMetadata = unknown, TData = unknown>(
    fileName: string,
    fileType: string,
    fileData: FileStructure<TMetadata, TData>,
    options: FileOperationOptions = {}
  ): Promise<FileSystemOperationResult<void>> {
    const context: OperationContext = {
      module: 'FileSystemService',
      operation: 'writeFile',
      details: `${fileName} (${fileType})`,
    };

    return executeWithErrorHandling(
      async () => {
        // Проверяет поддержку типа файла
        if (!isFileTypeSupported(fileType)) {
          throw new Error(
            FILESYSTEM_ERROR_MESSAGES[
              FILESYSTEM_ERROR_CODES.UNSUPPORTED_FILE_TYPE
            ]
          );
        }

        // Валидирует имя файла
        const fileNameValidation = this.validateFileName(fileName, fileType);
        if (!fileNameValidation.valid) {
          throw new Error(fileNameValidation.error);
        }

        // Блокирует файл
        const lockResult = await this.lockFile(fileName);
        if (!lockResult.success) {
          throw new Error(lockResult.error);
        }

        try {
          // Валидирует данные перед записью
          if (options.validate !== false) {
            const validationResult = await this.validateFileStructure(
              fileData,
              fileType
            );
            if (!validationResult.valid) {
              throw new Error(validationResult.error);
            }
          }

          // Создает резервную копию если файл существует
          const filePath = this.getFilePath(fileName, fileType);
          const fileExists = await this.fileExists(filePath);

          if (
            fileExists &&
            options.createBackup !== false &&
            this.config.enableBackup
          ) {
            await this.createBackup(fileName, fileType);
          }

          // Выполняет атомарную запись через временный файл
          await this.atomicWrite(filePath, fileData);

          console.log(
            `✅ File written successfully: ${fileName} (${fileType})`
          );
        } finally {
          // Разблокирует файл
          await this.unlockFile(fileName);
        }
      },
      {
        context,
        logOperation: options.logOperation !== false,
        returnErrorAsResult: true,
      }
    ) as Promise<FileSystemOperationResult<void>>;
  }

  /**
   * Удаляет файл указанного типа.
   *
   * @param fileName - Имя файла.
   * @param fileType - Тип файла.
   * @param options - Опции операции.
   * @returns Promise с результатом удаления.
   */
  async deleteFile(
    fileName: string,
    fileType: string,
    options: FileOperationOptions = {}
  ): Promise<FileSystemOperationResult<void>> {
    const context: OperationContext = {
      module: 'FileSystemService',
      operation: 'deleteFile',
      details: `${fileName} (${fileType})`,
    };

    return executeWithErrorHandling(
      async () => {
        // Проверяет поддержку типа файла
        if (!isFileTypeSupported(fileType)) {
          throw new Error(
            FILESYSTEM_ERROR_MESSAGES[
              FILESYSTEM_ERROR_CODES.UNSUPPORTED_FILE_TYPE
            ]
          );
        }

        // Валидирует имя файла
        const fileNameValidation = this.validateFileName(fileName, fileType);
        if (!fileNameValidation.valid) {
          throw new Error(fileNameValidation.error);
        }

        // Проверяет блокировку файла
        const lockStatus = await this.checkFileLock(fileName);
        if (lockStatus.isLocked) {
          throw new Error(
            FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_LOCKED]
          );
        }

        const filePath = this.getFilePath(fileName, fileType);

        // Проверяет существование файла
        if (!(await this.fileExists(filePath))) {
          throw new Error(
            FILESYSTEM_ERROR_MESSAGES[FILESYSTEM_ERROR_CODES.FILE_NOT_FOUND]
          );
        }

        // Создает резервную копию перед удалением
        if (options.createBackup !== false && this.config.enableBackup) {
          await this.createBackup(fileName, fileType);
        }

        // Удаляет файл
        await fs.unlink(filePath);

        console.log(`✅ File deleted successfully: ${fileName} (${fileType})`);
      },
      {
        context,
        logOperation: options.logOperation !== false,
        returnErrorAsResult: true,
      }
    ) as Promise<FileSystemOperationResult<void>>;
  }

  /**
   * Получает список файлов указанного типа.
   *
   * @param fileType - Тип файла (опционально).
   * @param searchParams - Параметры поиска.
   * @returns Promise со списком файлов.
   */
  async listFiles(
    fileType?: string,
    searchParams: FileSearchParams = {}
  ): Promise<FileSystemOperationResult<FileSearchResult>> {
    const context: OperationContext = {
      module: 'FileSystemService',
      operation: 'listFiles',
      details: `${fileType || 'all'}`,
    };

    return executeWithErrorHandling(
      async () => {
        const files: FileInfo[] = [];

        if (fileType) {
          // Получает файлы конкретного типа
          if (!isFileTypeSupported(fileType)) {
            throw new Error(
              FILESYSTEM_ERROR_MESSAGES[
                FILESYSTEM_ERROR_CODES.UNSUPPORTED_FILE_TYPE
              ]
            );
          }

          const folderPath = this.getFolderPath(fileType);
          const filesInFolder = await this.getFilesInFolder(
            folderPath,
            fileType
          );
          files.push(...filesInFolder);
        } else {
          // Получает файлы всех типов
          const supportedTypes = ['chat', 'document', 'settings', 'log'];
          for (const type of supportedTypes) {
            const folderPath = this.getFolderPath(type);
            const filesInFolder = await this.getFilesInFolder(folderPath, type);
            files.push(...filesInFolder);
          }
        }

        // Применяет фильтры поиска
        const filteredFiles = this.applySearchFilters(files, searchParams);

        // Применяет пагинацию
        const paginatedFiles = this.applyPagination(
          filteredFiles,
          searchParams
        );

        // Создает информацию о пагинации
        const pagination = this.createPaginationInfo(
          filteredFiles.length,
          searchParams.limit || 50,
          searchParams.offset || 0
        );

        console.log(`✅ Listed ${paginatedFiles.length} files`);
        return {
          files: paginatedFiles,
          totalCount: filteredFiles.length,
          pagination,
        };
      },
      {
        context,
        returnErrorAsResult: true,
      }
    ) as Promise<FileSystemOperationResult<FileSearchResult>>;
  }

  /**
   * Получает статистику файловой системы.
   *
   * @param fileType - Тип файла (опционально).
   * @returns Promise со статистикой.
   */
  async getFileSystemStats(
    fileType?: string
  ): Promise<FileSystemOperationResult<FileSystemStats>> {
    const context: OperationContext = {
      module: 'FileSystemService',
      operation: 'getFileSystemStats',
      details: `${fileType || 'all'}`,
    };

    return executeWithErrorHandling(
      async () => {
        const listResult = await this.listFiles(fileType);
        if (!listResult.success || !listResult.data) {
          throw new Error('Failed to list files');
        }

        const files = listResult.data.files;
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const lockedFiles = files.filter(file => file.isLocked).length;

        // Получает информацию о резервных копиях
        const backupFiles = await this.listBackupFiles();
        const backupCount = backupFiles.success
          ? backupFiles.data?.length || 0
          : 0;
        const backupSize =
          backupFiles.success && backupFiles.data
            ? backupFiles.data.reduce((sum, backup) => sum + backup.size, 0)
            : 0;

        // Создает статистику по типам файлов
        const fileTypeStats: Record<
          string,
          { count: number; totalSize: number }
        > = {};
        for (const file of files) {
          if (!fileTypeStats[file.fileType]) {
            fileTypeStats[file.fileType] = { count: 0, totalSize: 0 };
          }
          const stats = fileTypeStats[file.fileType];
          if (stats) {
            stats.count++;
            stats.totalSize += file.size;
          }
        }

        const stats: FileSystemStats = {
          totalFiles: files.length,
          totalSize,
          lockedFiles,
          backupCount,
          backupSize,
          lastCleanup: new Date().toISOString(),
          fileTypeStats,
        };

        console.log('✅ File system stats retrieved');
        return stats;
      },
      {
        context,
        returnErrorAsResult: true,
      }
    ) as Promise<FileSystemOperationResult<FileSystemStats>>;
  }

  /**
   * Создает необходимые директории.
   */
  private async createDirectories(): Promise<void> {
    const directories = [this.backupsPath, this.tempPath, this.locksPath];

    // Создание папок для всех поддерживаемых типов файлов
    const supportedTypes = ['chat', 'document', 'settings', 'log'];
    for (const fileType of supportedTypes) {
      const folderPath = this.getFolderPath(fileType);
      directories.push(folderPath);
    }

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
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
      console.error('File system access check failed:', error);
      throw new Error('File system is not accessible');
    }
  }

  /**
   * Получает путь к папке для указанного типа файла.
   *
   * @param fileType - Тип файла.
   * @returns Путь к папке.
   */
  private getFolderPath(fileType: string): string {
    const fileTypeConfig = getFileTypeConfig(fileType);
    if (!fileTypeConfig) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    return path.join(this.basePath, fileTypeConfig.folder);
  }

  /**
   * Получает путь к файлу.
   *
   * @param fileName - Имя файла.
   * @param fileType - Тип файла.
   * @returns Путь к файлу.
   */
  private getFilePath(fileName: string, fileType: string): string {
    const folderPath = this.getFolderPath(fileType);
    return path.join(folderPath, fileName);
  }

  /**
   * Получает файлы в указанной папке.
   *
   * @param folderPath - Путь к папке.
   * @param fileType - Тип файла.
   * @returns Массив информации о файлах.
   */
  private async getFilesInFolder(
    folderPath: string,
    fileType: string
  ): Promise<FileInfo[]> {
    try {
      const files = await fs.readdir(folderPath);
      const fileInfos: FileInfo[] = [];

      const fileTypeConfig = getFileTypeConfig(fileType);
      if (!fileTypeConfig) {
        return fileInfos;
      }

      for (const file of files) {
        if (file.endsWith(fileTypeConfig.extension)) {
          const filePath = path.join(folderPath, file);
          const stats = await fs.stat(filePath);
          const lockStatus = await this.checkFileLock(file);

          fileInfos.push({
            fileName: file,
            filePath,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            isLocked: lockStatus.isLocked,
            lockOwner: lockStatus.owner,
            fileType,
          });
        }
      }

      return fileInfos;
    } catch (error) {
      console.error(`Error reading folder ${folderPath}:`, error);
      return [];
    }
  }

  /**
   * Применяет фильтры поиска к списку файлов.
   *
   * @param files - Список файлов.
   * @param searchParams - Параметры поиска.
   * @returns Отфильтрованный список файлов.
   */
  private applySearchFilters(
    files: FileInfo[],
    searchParams: FileSearchParams
  ): FileInfo[] {
    let filteredFiles = [...files];

    // Фильтр по типу файла
    if (searchParams.fileType) {
      filteredFiles = filteredFiles.filter(
        file => file.fileType === searchParams.fileType
      );
    }

    // Фильтр по паттерну имени
    if (searchParams.namePattern) {
      const pattern = new RegExp(searchParams.namePattern, 'i');
      filteredFiles = filteredFiles.filter(file => pattern.test(file.fileName));
    }

    // Фильтр по размеру
    if (searchParams.minSize !== undefined) {
      const minSize = searchParams.minSize;
      filteredFiles = filteredFiles.filter(file => file.size >= minSize);
    }
    if (searchParams.maxSize !== undefined) {
      const maxSize = searchParams.maxSize;
      filteredFiles = filteredFiles.filter(file => file.size <= maxSize);
    }

    // Фильтр по дате создания
    if (searchParams.createdAfter) {
      const afterDate = new Date(searchParams.createdAfter);
      filteredFiles = filteredFiles.filter(
        file => new Date(file.createdAt) >= afterDate
      );
    }
    if (searchParams.createdBefore) {
      const beforeDate = new Date(searchParams.createdBefore);
      filteredFiles = filteredFiles.filter(
        file => new Date(file.createdAt) <= beforeDate
      );
    }

    // Фильтр по дате изменения
    if (searchParams.modifiedAfter) {
      const afterDate = new Date(searchParams.modifiedAfter);
      filteredFiles = filteredFiles.filter(
        file => new Date(file.modifiedAt) >= afterDate
      );
    }
    if (searchParams.modifiedBefore) {
      const beforeDate = new Date(searchParams.modifiedBefore);
      filteredFiles = filteredFiles.filter(
        file => new Date(file.modifiedAt) <= beforeDate
      );
    }

    // Фильтр по статусу блокировки
    if (searchParams.lockedOnly) {
      filteredFiles = filteredFiles.filter(file => file.isLocked);
    }
    if (searchParams.unlockedOnly) {
      filteredFiles = filteredFiles.filter(file => !file.isLocked);
    }

    return filteredFiles;
  }

  /**
   * Применяет пагинацию к списку файлов.
   *
   * @param files - Список файлов.
   * @param searchParams - Параметры поиска.
   * @returns Пагинированный список файлов.
   */
  private applyPagination(
    files: FileInfo[],
    searchParams: FileSearchParams
  ): FileInfo[] {
    const limit = searchParams.limit || 50;
    const offset = searchParams.offset || 0;

    return files.slice(offset, offset + limit);
  }

  /**
   * Создает информацию о пагинации.
   *
   * @param totalCount - Общее количество элементов.
   * @param pageSize - Размер страницы.
   * @param offset - Смещение.
   * @returns Информация о пагинации.
   */
  private createPaginationInfo(
    totalCount: number,
    pageSize: number,
    offset: number
  ) {
    const currentPage = Math.floor(offset / pageSize) + 1;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      page: currentPage,
      pageSize,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1,
    };
  }

  /**
   * Выполняет атомарную запись файла через временный файл.
   *
   * @param filePath - Путь к файлу.
   * @param data - Данные для записи.
   */
  private async atomicWrite(
    filePath: string,
    data: FileStructure
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
   * Валидирует структуру файла.
   *
   * @param data - Данные для валидации.
   * @param fileType - Тип файла.
   * @returns Результат валидации.
   */
  private async validateFileStructure(
    data: unknown,
    fileType: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const validator = FileValidatorFactory.getValidator(fileType);
      if (!validator) {
        return {
          valid: false,
          error: `No validator found for file type: ${fileType}`,
        };
      }

      // Проверяем что у валидатора есть метод validate
      if (typeof validator.validate !== 'function') {
        return {
          valid: false,
          error: `Validator for file type ${fileType} does not have validate method`,
        };
      }

      const isValid = validator.validate(data);
      if (!isValid) {
        return {
          valid: false,
          error: `Validation failed for file type: ${fileType}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation error',
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
      console.error(`Error locking file ${fileName}:`, error);
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
      console.error(`Error unlocking file ${fileName}:`, error);
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
   * @param fileType - Тип файла.
   * @returns Результат создания резервной копии.
   */
  private async createBackup(
    fileName: string,
    fileType: string
  ): Promise<FileSystemOperationResult<void>> {
    const context: OperationContext = {
      module: 'FileSystemService',
      operation: 'createBackup',
      details: `${fileName} (${fileType})`,
    };

    return executeWithErrorHandling(
      async () => {
        const sourcePath = this.getFilePath(fileName, fileType);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileTypeConfig = getFileTypeConfig(fileType);
        const backupFileName = `${fileName.replace(fileTypeConfig?.extension || '', '')}_${timestamp}${FILE_EXTENSIONS.BACKUP_FILE}`;
        const backupPath = path.join(this.backupsPath, backupFileName);

        // Копирует файл
        await fs.copyFile(sourcePath, backupPath);

        // Очищает старые резервные копии
        await this.cleanupOldBackups();

        console.log(`✅ Backup created: ${backupFileName}`);
      },
      {
        context,
        returnErrorAsResult: true,
      }
    ) as Promise<FileSystemOperationResult<void>>;
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

          // Извлекает имя исходного файла и тип
          const originalFile = file
            .replace(/_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/, '')
            .replace(FILE_EXTENSIONS.BACKUP_FILE, '');

          // Определяет тип файла по расширению
          let fileType = 'unknown';
          const supportedTypes = ['chat', 'document', 'settings', 'log'];
          for (const type of supportedTypes) {
            const config = getFileTypeConfig(type);
            if (config && originalFile.endsWith(config.extension)) {
              fileType = type.toLowerCase();
              break;
            }
          }

          backupFiles.push({
            fileName: file,
            filePath,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            originalFile,
            fileType,
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
      console.error('Error cleaning up expired locks:', error);
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
        const key = `${backup.originalFile}_${backup.fileType}`;
        if (!backupsByFile.has(key)) {
          backupsByFile.set(key, []);
        }
        const existingBackups = backupsByFile.get(key);
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
          console.error(`Error deleting backup ${filePath}:`, error);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  /**
   * Валидирует имя файла для предотвращения path traversal атак.
   *
   * @param fileName - Имя файла для валидации.
   * @param fileType - Тип файла.
   * @returns Результат валидации.
   */
  private validateFileName(
    fileName: string,
    fileType: string
  ): {
    valid: boolean;
    error?: string;
  } {
    if (!fileName || typeof fileName !== 'string') {
      return { valid: false, error: 'Invalid file name' };
    }

    // Проверяет на path traversal атаки
    if (VALIDATION_CONFIG.GENERAL.PATH_TRAVERSAL_PATTERN.test(fileName)) {
      return { valid: false, error: 'Path traversal detected' };
    }

    // Проверяет на опасные символы
    if (VALIDATION_CONFIG.GENERAL.FORBIDDEN_CHARS.test(fileName)) {
      return { valid: false, error: 'Dangerous characters detected' };
    }

    // Проверяет длину имени файла
    if (fileName.length > VALIDATION_CONFIG.GENERAL.MAX_FILENAME_LENGTH) {
      return { valid: false, error: 'File name too long' };
    }

    // Проверяет что имя файла не пустое после удаления пробелов
    if (fileName.trim().length === 0) {
      return { valid: false, error: 'File name cannot be empty' };
    }

    // Проверяет что файл имеет правильное расширение
    const fileTypeConfig = getFileTypeConfig(fileType);
    if (fileTypeConfig && !fileName.endsWith(fileTypeConfig.extension)) {
      return { valid: false, error: 'Invalid file extension' };
    }

    return { valid: true };
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
