/**
 * @module DirectoryFactory
 * Фабрика для создания и управления директориями файловой системы.
 * Создает только те директории, которые определены в FILESYSTEM_PATHS.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { FILESYSTEM_PATHS } from '../constants/filesystem';

/**
 * Класс для управления директориями файловой системы.
 * Создает директории на основе FILESYSTEM_PATHS и предоставляет доступ к путям.
 */
export class DirectoryFactory {
  private basePath: string;
  private directories: Map<keyof typeof FILESYSTEM_PATHS, string> = new Map();

  /**
   * Создает экземпляр DirectoryFactory.
   *
   * @param basePath - Базовый путь для создания директорий.
   */
  constructor(basePath: string) {
    this.basePath = basePath;
    this.initializeDirectories();
  }

  /**
   * Инициализирует карту директорий на основе FILESYSTEM_PATHS.
   */
  private initializeDirectories(): void {
    for (const [key, folderName] of Object.entries(FILESYSTEM_PATHS)) {
      this.directories.set(
        key as keyof typeof FILESYSTEM_PATHS,
        path.join(this.basePath, folderName)
      );
    }
  }

  /**
   * Создает все директории, определенные в FILESYSTEM_PATHS.
   *
   * @returns Promise с результатом создания директорий.
   */
  async createAll(): Promise<void> {
    const directoryPaths = Array.from(this.directories.values());

    for (const dirPath of directoryPaths) {
      try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
      } catch (error) {
        console.error(`Failed to create directory ${dirPath}:`, error);
        throw error;
      }
    }
  }

  /**
   * Получает путь к директории по ключу.
   *
   * @param key - Ключ директории из FILESYSTEM_PATHS.
   * @returns Полный путь к директории.
   * @throws Error если директория не определена в FILESYSTEM_PATHS.
   */
  getPath(key: string): string {
    const dirPath = this.directories.get(key as keyof typeof FILESYSTEM_PATHS);
    if (!dirPath) {
      throw new Error(`Directory ${key} is not defined in FILESYSTEM_PATHS`);
    }
    return dirPath;
  }

  /**
   * Проверяет существует ли директория в FILESYSTEM_PATHS.
   *
   * @param key - Ключ директории из FILESYSTEM_PATHS.
   * @returns true если директория определена.
   */
  has(key: string): boolean {
    return this.directories.has(key as keyof typeof FILESYSTEM_PATHS);
  }

  /**
   * Получает все пути к директориям.
   *
   * @returns Массив путей к директориям.
   */
  getAllPaths(): string[] {
    return Array.from(this.directories.values());
  }

  /**
   * Получает все ключи директорий.
   *
   * @returns Массив ключей директорий.
   */
  getAllKeys(): Array<keyof typeof FILESYSTEM_PATHS> {
    return Array.from(this.directories.keys());
  }
}

/**
 * Создает экземпляр DirectoryFactory.
 *
 * @param basePath - Базовый путь для создания директорий.
 * @returns Экземпляр DirectoryFactory.
 */
export function createDirectoryFactory(basePath: string): DirectoryFactory {
  return new DirectoryFactory(basePath);
}
