/**
 * @module ChatValidator
 * Валидация запросов для режима чата.
 * Обеспечивает проверку корректности входных данных перед обработкой.
 */

import type { ModelRequestContext } from '../../hooks/use-model/types/feature-provider';
import type { ChatValidationResult } from './types/chat-handlers';

/**
 * Валидирует запрос чата.
 * Проверяет наличие обязательных параметров и корректность данных.
 *
 * @param context - Контекст запроса к модели.
 * @returns Результат валидации.
 */
export function validateChatRequest(
  context: ModelRequestContext
): ChatValidationResult {
  // Валидация chatId
  const chatIdValidation = validateChatId(context.chatId);

  if (!chatIdValidation.success) {
    return chatIdValidation;
  }

  // Валидация сообщения
  const messageValidation = validateMessage(context.text);

  if (!messageValidation.success) {
    return messageValidation;
  }

  // Валидация конфигурации
  const configValidation = validateConfig(context);

  if (!configValidation.success) {
    return configValidation;
  }

  return { success: true };
}

/**
 * Валидирует идентификатор чата.
 *
 * @param chatId - Идентификатор чата для валидации.
 * @returns Результат валидации.
 */
function validateChatId(chatId?: string): ChatValidationResult {
  if (!chatId) {
    return {
      success: false,
      error: 'Chat ID is required for chat mode',
    };
  }

  if (typeof chatId !== 'string') {
    return {
      success: false,
      error: 'Chat ID must be a string',
    };
  }

  if (chatId.trim().length === 0) {
    return {
      success: false,
      error: 'Chat ID cannot be empty',
    };
  }

  return { success: true };
}

/**
 * Валидирует текст сообщения.
 *
 * @param text - Текст или массив текстов для валидации.
 * @returns Результат валидации.
 */
function validateMessage(text: string | string[]): ChatValidationResult {
  if (!text) {
    return {
      success: false,
      error: 'Message text is required',
    };
  }

  if (typeof text === 'string') {
    if (text.trim().length === 0) {
      return {
        success: false,
        error: 'Message text cannot be empty',
      };
    }
  } else if (Array.isArray(text)) {
    if (text.length === 0) {
      return {
        success: false,
        error: 'Message text array cannot be empty',
      };
    }

    const hasValidText = text.some(
      (item) => typeof item === 'string' && item.trim().length > 0
    );

    if (!hasValidText) {
      return {
        success: false,
        error: 'Message text array must contain at least one non-empty string',
      };
    }
  } else {
    return {
      success: false,
      error: 'Message text must be a string or an array of strings',
    };
  }

  return { success: true };
}

/**
 * Валидирует конфигурацию запроса.
 *
 * @param context - Контекст запроса к модели.
 * @returns Результат валидации.
 */
function validateConfig(context: ModelRequestContext): ChatValidationResult {
  if (!context.config) {
    return {
      success: false,
      error: 'Config is required',
    };
  }

  if (!context.config.id || typeof context.config.id !== 'string') {
    return {
      success: false,
      error: 'Config id must be a valid string',
    };
  }

  if (!context.config.url || typeof context.config.url !== 'string') {
    return {
      success: false,
      error: 'Config url must be a valid string',
    };
  }

  if (!context.ragConfig) {
    return {
      success: false,
      error: 'RAG config is required',
    };
  }

  if (
    typeof context.ragConfig.topK !== 'number' ||
    context.ragConfig.topK < 0
  ) {
    return {
      success: false,
      error: 'RAG config topK must be a non-negative number',
    };
  }

  if (
    typeof context.ragConfig.similarityThreshold !== 'number' ||
    context.ragConfig.similarityThreshold < 0 ||
    context.ragConfig.similarityThreshold > 1
  ) {
    return {
      success: false,
      error: 'RAG config similarityThreshold must be a number between 0 and 1',
    };
  }

  return { success: true };
}
