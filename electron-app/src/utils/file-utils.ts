/**
 * @module FileUtils
 * Утилиты для работы с файлами и путями.
 * Предоставляет функции для определения типов файлов, расширений и других операций с файлами.
 */

import * as path from 'path';

/**
 * Получает расширение файла из пути.
 * Возвращает расширение без точки в нижнем регистре.
 *
 * @param filePath - Путь к файлу.
 * @returns Расширение файла без точки (например, 'pdf', 'txt', 'md').
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().slice(1);
}

/**
 * Проверяет, является ли файл поддерживаемым типом документа.
 *
 * @param filePath - Путь к файлу.
 * @param supportedExtensions - Массив поддерживаемых расширений (без точки).
 * @returns true если файл поддерживается.
 */
export function isSupportedFileType(
  filePath: string,
  supportedExtensions: string[]
): boolean {
  const extension = getFileExtension(filePath);
  return supportedExtensions.includes(extension);
}

/**
 * Получает имя файла без расширения.
 *
 * @param filePath - Путь к файлу.
 * @returns Имя файла без расширения.
 */
export function getFileNameWithoutExtension(filePath: string): string {
  const basename = path.basename(filePath);
  const ext = path.extname(basename);
  return basename.slice(0, -ext.length);
}
