/**
 * @module ModelsConstants
 * Константы для работы с моделями.
 */

import type { ModelsApiConfig } from '../types/models';

/**
 * Конфигурация по умолчанию для ModelsApi.
 */
export const DEFAULT_CONFIG: ModelsApiConfig = {
  baseUrl: 'https://ollama-models.zwz.workers.dev',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

/**
 * Коэффициенты для расчета требуемой памяти на основе параметров модели.
 * Формула: baseMemory * quantizationRatio * safetyMargin
 */
export const SAFETY_MARGIN = 1.5; // Запас 50% для работы системы и буферов

/**
 * Коэффициенты сжатия для разных уровней квантизации.
 * Используется Map для O(1) доступа.
 */
export const QUANTIZATION_RATIOS = new Map<string, number>([
  ['q1', 0.125], // Q1 - 8x сжатие
  ['q2', 0.25], // Q2 - 4x сжатие
  ['q3', 0.375], // Q3 - ~2.67x сжатие
  ['q4', 0.5], // Q4 - 2x сжатие (популярная)
  ['q5', 0.625], // Q5 - ~1.6x сжатие
  ['q6', 0.75], // Q6 - ~1.33x сжатие
  ['q7', 0.875], // Q7 - ~1.14x сжатие
  ['q8', 1.0], // Q8 - минимальная компрессия
  ['fp16', 1.0], // FP16 - без компрессии
  ['fp32', 2.0], // FP32 - 2x больше чем FP16
]);

/**
 * Минимальные требования к RAM для разных размеров моделей.
 * Используется Map для O(1) доступа.
 * Значения основаны на типичных требованиях для моделей в формате GGUF.
 */
export const MIN_RAM_REQUIREMENTS = new Map<string, number>([
  ['0.5b', 1 * 1024 * 1024 * 1024], // 1GB для 0.5B
  ['0.6b', 1.5 * 1024 * 1024 * 1024], // 1.5GB для 0.6B
  ['1b', 2 * 1024 * 1024 * 1024], // 2GB для 1B
  ['1.5b', 3 * 1024 * 1024 * 1024], // 3GB для 1.5B
  ['1.7b', 3.5 * 1024 * 1024 * 1024], // 3.5GB для 1.7B
  ['2b', 4 * 1024 * 1024 * 1024], // 4GB для 2B
  ['3b', 6 * 1024 * 1024 * 1024], // 6GB для 3B
  ['3.8b', 7 * 1024 * 1024 * 1024], // 7GB для 3.8B
  ['4b', 8 * 1024 * 1024 * 1024], // 8GB для 4B
  ['7b', 12 * 1024 * 1024 * 1024], // 12GB для 7B
  ['8b', 16 * 1024 * 1024 * 1024], // 16GB для 8B
  ['12b', 20 * 1024 * 1024 * 1024], // 20GB для 12B
  ['13b', 24 * 1024 * 1024 * 1024], // 24GB для 13B
  ['14b', 28 * 1024 * 1024 * 1024], // 28GB для 14B
  ['27b', 50 * 1024 * 1024 * 1024], // 50GB для 27B
  ['30b', 60 * 1024 * 1024 * 1024], // 60GB для 30B
  ['32b', 64 * 1024 * 1024 * 1024], // 64GB для 32B
  ['70b', 128 * 1024 * 1024 * 1024], // 128GB для 70B
  ['72b', 128 * 1024 * 1024 * 1024], // 128GB для 72B
  ['110b', 200 * 1024 * 1024 * 1024], // 200GB для 110B
  ['235b', 400 * 1024 * 1024 * 1024], // 400GB для 235B
  ['240b', 400 * 1024 * 1024 * 1024], // 400GB для 240B
]);

/**
 * Паттерны для поиска размера параметров в теге.
 * Определяет порядок проверки паттернов и соответствующие действия.
 */
export const PARAMETER_SIZE_PATTERNS: Array<{
  finder: (tag: string) => number | null;
  extractor: (tag: string, index: number) => string | null;
}> = [
  // Паттерн "b-" (есть квантизация после размера)
  {
    finder: tag => tag.indexOf('b-'),
    extractor: (tag, index) => {
      const beforeB = tag.substring(0, index);
      const sizeMatch = beforeB.match(/(\d+(?:\.\d+)?)\s*$/);
      return sizeMatch && sizeMatch[1] ? sizeMatch[1] : null;
    },
  },
  // Паттерн "b" (квантизация не указана или указана отдельно)
  {
    finder: tag => {
      const index = tag.indexOf('b');
      // Проверяем, что после "b" нет дефиса (иначе это уже обработано выше)
      return index !== -1 && (index + 1 >= tag.length || tag[index + 1] !== '-')
        ? index
        : null;
    },
    extractor: (tag, index) => {
      const beforeB = tag.substring(0, index);
      const sizeMatch = beforeB.match(/(\d+(?:\.\d+)?)\s*$/);
      return sizeMatch && sizeMatch[1] ? sizeMatch[1] : null;
    },
  },
];

/**
 * Таблица нормализации размеров параметров.
 * Отсортированный массив пороговых значений и соответствующих нормализованных размеров.
 * Используется для бинарного поиска или линейного поиска.
 */
export const PARAMETER_SIZE_THRESHOLDS: Array<[number, string]> = [
  [0.55, '0.5b'],
  [0.8, '0.6b'],
  [1.25, '1b'],
  [1.6, '1.5b'],
  [1.85, '1.7b'],
  [2.5, '2b'],
  [3.5, '3b'],
  [3.9, '3.8b'],
  [5.5, '4b'],
  [7.5, '7b'],
  [10, '8b'],
  [12.5, '12b'],
  [13.5, '13b'],
  [20, '14b'],
  [28.5, '27b'],
  [31, '30b'],
  [35, '32b'],
  [71, '70b'],
  [73, '72b'],
  [115, '110b'],
  [237.5, '235b'],
  [Infinity, '240b'],
];

/**
 * Паттерны для поиска квантизации в теге.
 * Определяет порядок проверки и соответствующие значения.
 */
export const QUANTIZATION_PATTERNS: Array<{
  matcher: (tag: string) => boolean;
  extractor: (tag: string) => string;
}> = [
  // Паттерн q<цифра> (q4, q4_0, q4_K_M и т.д.)
  {
    matcher: tag => /q\d+/.test(tag),
    extractor: tag => {
      const match = tag.match(/q(\d+)/);
      return match && match[1] ? `q${match[1]}` : 'q4';
    },
  },
  // Паттерн qat (quantization aware training) - обычно это Q4
  {
    matcher: tag => tag.includes('qat'),
    extractor: () => 'q4',
  },
  // Паттерн fp16
  {
    matcher: tag => tag.includes('fp16'),
    extractor: () => 'fp16',
  },
  // Паттерн fp32
  {
    matcher: tag => tag.includes('fp32'),
    extractor: () => 'fp32',
  },
];
