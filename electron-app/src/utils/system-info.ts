/**
 * @module SystemInfo
 * Утилита для получения информации о системе.
 * Используется для определения совместимости моделей с устройством.
 */

import * as si from 'systeminformation';
import type { SystemInfo } from '../types/system-info';

/**
 * Получает информацию о системе.
 * Кэширует результат для оптимизации производительности.
 *
 * @returns Promise с информацией о системе.
 */
let cachedSystemInfo: SystemInfo | null = null;

export async function getSystemInfo(): Promise<SystemInfo> {
  // Возвращает кэшированное значение, если оно есть
  if (cachedSystemInfo) {
    return cachedSystemInfo;
  }

  try {
    const memInfo = await si.mem();
    cachedSystemInfo = {
      totalMemory: memInfo.total,
      availableMemory: memInfo.available,
    };
    return cachedSystemInfo;
  } catch (error) {
    console.error('Error getting system info:', error);
    // Возвращает консервативные значения по умолчанию
    return {
      totalMemory: 8 * 1024 * 1024 * 1024, // 8GB по умолчанию
      availableMemory: 4 * 1024 * 1024 * 1024, // 4GB по умолчанию
    };
  }
}

/**
 * Очищает кэш информации о системе.
 * Полезно при необходимости обновить данные.
 */
export function clearSystemInfoCache(): void {
  cachedSystemInfo = null;
}
