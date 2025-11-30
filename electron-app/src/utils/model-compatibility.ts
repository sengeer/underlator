/**
 * @module ModelCompatibility
 * Набор утилит для быстрого определения совместимости модели с системой.
 * Использует O(1) операции по Big O нотации для максимальной производительности.
 */

import type { SystemInfo } from '../types/system-info';
import { translations } from '../main';
import type { CompatibilityResult } from '../types/models';
import {
  PARAMETER_SIZE_PATTERNS,
  MIN_RAM_REQUIREMENTS,
  QUANTIZATION_RATIOS,
  SAFETY_MARGIN,
  PARAMETER_SIZE_THRESHOLDS,
  QUANTIZATION_PATTERNS,
} from '../constants/models';

/**
 * Извлекает размер параметров из тега модели.
 * Использует процедурный подход с массивом паттернов.
 * O(n*m) где n - длина строки, m - количество паттернов (обычно 2).
 *
 * @param tag - Тег модели (например, "1b", "7b-instruct-q4_K_M", "0.6b-q4_K_M").
 * @returns Размер параметров в виде строки (например, "1b", "7b") или null.
 */
export function extractParameterSize(tag: string): string | null {
  const lowerTag = tag.toLowerCase();

  // Процедурно проверяем каждый паттерн до первого успешного совпадения
  for (const pattern of PARAMETER_SIZE_PATTERNS) {
    const index = pattern.finder(lowerTag);
    if (index !== null) {
      const sizeStr = pattern.extractor(lowerTag, index);
      if (sizeStr) {
        const size = parseFloat(sizeStr);
        return normalizeParameterSize(size);
      }
    }
  }

  return null;
}

/**
 * Нормализует размер параметров к стандартным значениям.
 * Использует процедурный подход с поиском в отсортированном массиве.
 * O(n) где n - количество порогов (обычно ~22, практически O(1)).
 *
 * @param size - Числовое значение размера параметров.
 * @returns Нормализованный размер в виде строки.
 */
function normalizeParameterSize(size: number): string {
  // Процедурный поиск первого порога, который больше или равен размеру
  const threshold = PARAMETER_SIZE_THRESHOLDS.find(
    ([threshold]) => size < threshold
  );
  return threshold ? threshold[1] : '240b';
}

/**
 * Извлекает уровень квантизации из тега модели.
 * Использует процедурный подход с массивом паттернов.
 * O(n*m) где n - длина строки, m - количество паттернов (обычно 4).
 *
 * @param tag - Тег модели (например, "1b", "7b-instruct-q4_K_M", "0.6b-q4_K_M").
 * @returns Ключ квантизации (например, "q4", "q8", "fp16", "q4" по умолчанию).
 */
export function extractQuantizationLevel(tag: string): string {
  const lowerTag = tag.toLowerCase();

  // Процедурно проверяем каждый паттерн до первого успешного совпадения
  for (const pattern of QUANTIZATION_PATTERNS) {
    if (pattern.matcher(lowerTag)) {
      return pattern.extractor(lowerTag);
    }
  }

  // Если тег содержит только размер параметров без квантизации (например, "1b", "7b"),
  // используется Q4 как наиболее популярная квантизация
  // Это консервативная оценка, так как Q4 дает хороший баланс качества и размера
  return 'q4';
}

/**
 * Вычисляет требуемую память для модели.
 * Использует O(1) операции с Map для максимальной производительности.
 *
 * @param parameterSize - Размер параметров модели (например, "1b", "7b", "8b").
 * @param quantizationLevel - Уровень квантизации (например, "q4", "q8", "fp16").
 * @returns Требуемая память в байтах.
 */
function calculateRequiredMemory(
  parameterSize: string | null,
  quantizationLevel: string
): number {
  // Если не удалось определить размер параметров, используется консервативная оценка
  if (!parameterSize) {
    return 16 * 1024 * 1024 * 1024; // 16GB по умолчанию
  }

  // Получает минимальные требования из Map (O(1))
  const baseMemory = MIN_RAM_REQUIREMENTS.get(parameterSize);
  if (!baseMemory) {
    // Если размер не найден, используется консервативная оценка
    return 16 * 1024 * 1024 * 1024;
  }

  // Получает коэффициент квантизации из Map (O(1))
  const quantRatio = QUANTIZATION_RATIOS.get(quantizationLevel) || 0.5;

  // Вычисляет требуемую память с учетом квантизации и запаса
  // Формула: базовый размер * коэффициент квантизации * запас безопасности
  return Math.ceil(baseMemory * quantRatio * SAFETY_MARGIN);
}

/**
 * Проверяет совместимость модели с системой.
 * Алгоритм работает за O(1) благодаря использованию Map структур.
 *
 * @param modelName - Название модели.
 * @param quantizationTag - Тег квантизации.
 * @param systemInfo - Информация о системе.
 * @returns Результат проверки совместимости.
 */
export function checkModelCompatibility(
  modelName: string,
  quantizationTag: string,
  systemInfo: SystemInfo
): CompatibilityResult {
  // Извлекает размер параметров (сначала из тега, потом из названия модели)
  // O(n) где n - длина строки
  const parameterSize =
    extractParameterSize(quantizationTag) || extractParameterSize(modelName);

  // Извлекает уровень квантизации (O(n) где n - длина строки)
  const quantizationLevel = extractQuantizationLevel(quantizationTag);

  // Вычисляет требуемую память (O(1) благодаря Map)
  const requiredMemory = calculateRequiredMemory(
    parameterSize,
    quantizationLevel
  );

  // Проверяет совместимость (O(1))
  if (systemInfo.totalMemory >= requiredMemory) {
    const requiredGB = Math.ceil(requiredMemory / (1024 * 1024 * 1024));
    return {
      status: 'ok',
      message: [
        `${translations.OK}`,
        `~${requiredGB}${translations.GB} ${translations.RAM}`,
      ],
    };
  }

  // Определяет причину несовместимости
  const requiredGB = Math.ceil(requiredMemory / (1024 * 1024 * 1024));
  return {
    status: 'insufficient_ram',
    message: [
      `${translations.INSUFFICIENT_RAM}`,
      `~${requiredGB}${translations.GB} ${translations.RAM}`,
    ],
  };
}
