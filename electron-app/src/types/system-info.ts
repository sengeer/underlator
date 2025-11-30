/**
 * @module SystemInfoTypes
 * Типы для работы с информацией о системе.
 */

/**
 * Информация о системе для проверки совместимости.
 */
export interface SystemInfo {
  /** Общий объем RAM в байтах */
  totalMemory: number;
  /** Доступная RAM в байтах */
  availableMemory: number;
}
