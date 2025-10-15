/**
 * @module ContextualTranslation
 * Утилиты для контекстного перевода между различными провайдерами.
 * Предоставляет функции для определения необходимости контекстного перевода,
 * получения конфигурации провайдеров и валидации параметров.
 */

import {
  ContextualTranslationConfig,
  ContextualTranslationDecision,
} from './types/contextual-translation';

/**
 * Определяет, следует ли использовать контекстный перевод.
 * Чистая функция для принятия решения о применении контекстного перевода
 * на основе входных параметров и типа использования.
 *
 * Контекстный перевод используется для массивов текстовых фрагментов,
 * когда необходимо сохранить контекст между фрагментами для лучшего качества перевода.
 *
 * @param text - Текст или массив текстов для обработки.
 * @param params - Параметры генерации с настройками контекстного перевода.
 * @param typeUse - Тип использования модели ('instruction' | 'translation').
 * @returns Решение о необходимости контекстного перевода с обоснованием.
 *
 * @example
 * // Определение необходимости контекстного перевода для массива текстов
 * const decision = shouldUseContextualTranslation(
 *   ['Hello world', 'How are you?'],
 *   'contextualTranslation'
 * );
 * console.log(decision); // { useContextual: true, reason: 'multiple_chunks' }
 *
 * @example
 * // Отключение контекстного перевода для режима инструкций
 * const decision = shouldUseContextualTranslation(
 *   ['Text to process'],
 *   'contextualTranslation'
 * );
 * console.log(decision); // { useContextual: false, reason: 'instruction_mode' }
 */
export const shouldUseContextualTranslation = (
  text: string | string[],
  typeUse?: string
): ContextualTranslationDecision => {
  // Не использовать контекстный перевод для режима инструкций
  if (typeUse !== 'contextualTranslation') {
    return { useContextual: false, reason: 'disabled' };
  }

  // Не использовать для одиночных фрагментов
  if (!Array.isArray(text) || text.length <= 1) {
    return { useContextual: false, reason: 'single_chunk' };
  }

  // Использовать контекстный перевод для множественных фрагментов
  return { useContextual: true, reason: 'multiple_chunks' };
};

/**
 * Получает конфигурацию контекстного перевода для указанного провайдера.
 * Возвращает настройки поддержки контекстного перевода для конкретного провайдера LLM.
 * Включает информацию о максимальном количестве фрагментов на запрос.
 *
 * @param providerType - Тип провайдера ('Ollama', 'Embedded Ollama', 'OpenRouter').
 * @returns Конфигурация контекстного перевода для провайдера.
 *
 * @example
 * // Получение конфигурации для Ollama
 * const config = getContextualTranslationConfig('Ollama');
 * console.log(config); // { enabled: true, maxChunksPerRequest: 50 }
 *
 * @example
 * // Получение конфигурации для неподдерживаемого провайдера
 * const config = getContextualTranslationConfig('UnknownProvider');
 * console.log(config); // { enabled: false }
 */
export const getContextualTranslationConfig = (
  providerType: string
): ContextualTranslationConfig => {
  const configs: Record<string, ContextualTranslationConfig> = {
    Ollama: {
      enabled: true,
      maxChunksPerRequest: 50,
    },
    OpenRouter: {
      enabled: true,
      maxChunksPerRequest: 100,
    },
    'Embedded Ollama': {
      enabled: true,
      maxChunksPerRequest: 50,
    },
  };

  return (
    configs[providerType] || {
      enabled: false,
    }
  );
};

/**
 * Валидирует параметры контекстного перевода.
 * Чистая функция для проверки корректности входных данных перед выполнением
 * контекстного перевода. Проверяет поддержку провайдера, количество фрагментов
 * и отсутствие пустых текстов.
 *
 * @param texts - Массив текстовых фрагментов для перевода.
 * @param config - Конфигурация контекстного перевода провайдера.
 * @returns Результат валидации с информацией об ошибках.
 *
 * @example
 * // Валидация корректных параметров
 * const config = getContextualTranslationConfig('Ollama');
 * const result = validateContextualTranslationParams(
 *   ['Hello world', 'How are you?'],
 *   config
 * );
 * console.log(result); // { valid: true }
 *
 * @example
 * // Валидация с превышением лимита фрагментов
 * const config = getContextualTranslationConfig('Ollama');
 * const texts = Array(60).fill('text'); // 60 фрагментов > 50
 * const result = validateContextualTranslationParams(texts, config);
 * console.log(result); // { valid: false, reason: 'Too many chunks: 60 > 50' }
 *
 * @example
 * // Валидация с пустыми фрагментами
 * const config = getContextualTranslationConfig('Ollama');
 * const result = validateContextualTranslationParams(
 *   ['Hello', '', 'World'],
 *   config
 * );
 * console.log(result); // { valid: false, reason: 'Empty chunks detected' }
 */
export const validateContextualTranslationParams = (
  texts: string[],
  config: ContextualTranslationConfig
): { valid: boolean; reason?: string } => {
  if (!config.enabled) {
    return {
      valid: false,
      reason: 'Provider does not support contextual translation',
    };
  }

  if (config.maxChunksPerRequest && texts.length > config.maxChunksPerRequest) {
    return {
      valid: false,
      reason: `Too many chunks: ${texts.length} > ${config.maxChunksPerRequest}`,
    };
  }

  if (texts.some((text) => text.trim().length === 0)) {
    return { valid: false, reason: 'Empty chunks detected' };
  }

  return { valid: true };
};
