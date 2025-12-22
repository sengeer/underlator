/**
 * @module ChatPromptBuilder
 * Построение промпта для режима чата.
 * Обеспечивает построение промпта с использованием PromptManager и управление суммированием контекста.
 */

import type { ModelRequestContext } from '../../hooks/use-model/types/feature-provider';
import type { ChatContext } from '../../hooks/use-model/types/use-model';
import {
  buildChatPrompt,
  calculateChatContextTokens,
  getProviderTokenLimits,
  validateChatContext,
} from '../../hooks/use-model/utils/chat-context';
import callANotificationWithALog from '../../utils/call-a-notification-with-a-log';
import { promptManager } from '../../utils/prompt-manager';
import type { ChatPromptResult } from './types/chat-handlers';

/**
 * Строит промпт для чата с использованием PromptManager.
 * Управляет суммированием контекста при превышении лимитов.
 *
 * @param chatContext - Контекст чата.
 * @param ragContext - RAG контекст.
 * @param requestContext - Контекст запроса к модели.
 * @returns Результат построения промпта.
 */
export async function buildChatPromptWithContext(
  chatContext: ChatContext,
  ragContext: string,
  requestContext: ModelRequestContext
): Promise<ChatPromptResult> {
  try {
    // Валидация контекста чата
    const contextValidation = validateChatContext(chatContext);

    if (!contextValidation.success) {
      const error = `Invalid chat context: ${contextValidation.error}`;

      callANotificationWithALog(
        requestContext.dispatch,
        requestContext.t`Invalid chat context`,
        error
      );

      return {
        success: false,
        error,
      };
    }

    // Получает системный промпт из PromptManager
    const systemPromptResult = getSystemPrompt();

    if (!systemPromptResult.success) {
      return {
        success: false,
        error: systemPromptResult.error || 'Failed to get system prompt',
      };
    }

    // Управляет суммированием контекста при необходимости
    const managedContext = await manageContextSummarization(
      chatContext,
      requestContext
    );

    if (!managedContext.success) {
      return {
        success: false,
        error: managedContext.error || 'Failed to manage context summarization',
      };
    }

    // Строит финальный промпт используя существующую функцию buildChatPrompt
    if (!managedContext.context) {
      return {
        success: false,
        error: 'Failed to get managed context',
      };
    }

    const promptResult = buildFullPrompt(
      managedContext.context,
      ragContext,
      systemPromptResult.prompt || '',
      requestContext
    );

    return promptResult;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: `Failed to build chat prompt: ${errorMessage}`,
    };
  }
}

/**
 * Получает системный промпт из PromptManager.
 *
 * @param requestContext - Контекст запроса к модели.
 * @returns Результат получения системного промпта.
 */
function getSystemPrompt(): ChatPromptResult {
  try {
    const promptResult = promptManager.getPrompt('chat');

    if (!promptResult.success) {
      return {
        success: false,
        error:
          promptResult.error ||
          'Failed to get system prompt from PromptManager',
      };
    }

    return {
      success: true,
      prompt: promptResult.data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error getting system prompt',
    };
  }
}

/**
 * Управляет суммированием контекста при превышении лимитов.
 *
 * @param chatContext - Контекст чата.
 * @param requestContext - Контекст запроса к модели.
 * @returns Результат управления суммированием.
 */
async function manageContextSummarization(
  chatContext: ChatContext,
  requestContext: ModelRequestContext
): Promise<{ success: boolean; context?: ChatContext; error?: string }> {
  try {
    // Получает лимиты токенов для провайдера
    const providerLimits = getProviderTokenLimits(requestContext.config.id);
    const currentTokens = calculateChatContextTokens(chatContext);

    // Проверяет превышение лимитов
    if (currentTokens > providerLimits.maxContextTokens) {
      // Использует существующую функцию buildChatPrompt для суммирования
      // Она автоматически применяет суммирование при превышении лимитов
      const summarizationResult = buildChatPrompt(chatContext, '', {
        provider: requestContext.config.id,
        maxContextTokens: providerLimits.maxContextTokens,
        enableSummarization: true,
        preserveRecentMessages: 5,
      });

      if (!summarizationResult.success) {
        return {
          success: false,
          error: `Context summarization failed: ${summarizationResult.error}`,
        };
      }

      // Возвращает исходный контекст, так как buildChatPrompt обрабатывает суммирование внутри
      return {
        success: true,
        context: chatContext,
      };
    }

    return {
      success: true,
      context: chatContext,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error managing context summarization',
    };
  }
}

/**
 * Строит финальный промпт с использованием buildChatPrompt.
 *
 * @param chatContext - Контекст чата.
 * @param ragContext - RAG контекст.
 * @param systemPrompt - Системный промпт.
 * @param requestContext - Контекст запроса к модели.
 * @returns Результат построения промпта.
 */
function buildFullPrompt(
  chatContext: ChatContext,
  ragContext: string,
  systemPrompt: string,
  requestContext: ModelRequestContext
): ChatPromptResult {
  try {
    // Использует существующую функцию buildChatPrompt
    const promptResult = buildChatPrompt(chatContext, ragContext, {
      provider: requestContext.config.id,
      systemPrompt: systemPrompt || chatContext.systemPrompt,
      maxContextTokens: getProviderTokenLimits(requestContext.config.id)
        .maxContextTokens,
      enableSummarization: true,
      preserveRecentMessages: 5,
    });

    if (!promptResult.success) {
      return {
        success: false,
        error: promptResult.error || 'Failed to build prompt',
      };
    }

    return {
      success: true,
      prompt: promptResult.data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error building full prompt',
    };
  }
}
