/**
 * @module ChatContextLoader
 * Загрузка контекста чата для режима чата.
 * Обеспечивает загрузку контекста чата через IPC и преобразование в ChatContext.
 */

import { chatIpc } from '../../../apis/chat-ipc/';
import type { ModelRequestContext } from '../../hooks/use-model/types/feature-provider';
import type {
  ChatContext,
  ChatMessage,
} from '../../hooks/use-model/types/use-model';
import callANotificationWithALog from '../../utils/call-a-notification-with-a-log';
import type { ChatContextResult } from './types/chat-handlers';

/**
 * Загружает контекст чата через IPC API.
 * Преобразует данные IPC в ChatContext.
 *
 * @param context - Контекст запроса к модели.
 * @returns Результат загрузки контекста чата.
 */
export async function loadChatContext(
  context: ModelRequestContext
): Promise<ChatContextResult> {
  try {
    if (!context.chatId) {
      return {
        success: false,
        error: 'Chat ID is required for chat context loading',
      };
    }

    // Загружает чат через IPC
    const chatResult = await chatIpc.getChat({ chatId: context.chatId });

    if (!chatResult.success || !chatResult.data) {
      const error = `Failed to load chat context: ${chatResult.error || 'Unknown error'}`;

      callANotificationWithALog(
        context.dispatch,
        context.t`Failed to load chat context`,
        error
      );

      return {
        success: false,
        error,
      };
    }

    // Преобразует данные IPC в ChatContext
    const chatContext = transformToChatContext(chatResult.data);

    return {
      success: true,
      context: chatContext,
    };
  } catch (error) {
    return handleContextErrors(error, context);
  }
}

/**
 * Преобразует данные IPC в ChatContext.
 * Адаптирует структуру данных под интерфейс ChatContext.
 *
 * @param chatData - Данные чата из IPC.
 * @returns Преобразованный ChatContext.
 */
function transformToChatContext(chatData: any): ChatContext {
  return {
    messages: (chatData.messages || []) as ChatMessage[],
    maxContextMessages: 50,
    systemPrompt:
      "You are a helpful assistant. Answer the user's questions using the context of previous messages.",
    generationSettings: {
      temperature: 0.7,
      maxTokens: 2048,
    },
  };
}

/**
 * Обрабатывает ошибки загрузки контекста.
 *
 * @param error - Ошибка для обработки.
 * @param context - Контекст запроса к модели.
 * @returns Результат с ошибкой.
 */
function handleContextErrors(
  error: unknown,
  context: ModelRequestContext
): ChatContextResult {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  callANotificationWithALog(
    context.dispatch,
    context.t`Failed to load chat context`,
    `Chat context loading failed: ${errorMessage}`
  );

  return {
    success: false,
    error: `Chat context loading failed: ${errorMessage}`,
  };
}
