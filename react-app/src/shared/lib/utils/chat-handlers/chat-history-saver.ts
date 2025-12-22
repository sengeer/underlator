/**
 * @module ChatHistorySaver
 * Сохранение истории чата.
 * Обеспечивает сохранение сообщений пользователя и ассистента через IPC.
 */

import { chatIpc } from '../../../apis/chat-ipc/';
import type {
  ChatHistoryResult,
  ChatHistorySaveConfig,
} from './types/chat-handlers';

/**
 * Сохраняет историю чата через IPC.
 * Сохраняет сообщения пользователя и ассистента без прерывания выполнения при ошибках.
 *
 * @param config - Конфигурация для сохранения истории.
 * @returns Результат сохранения истории.
 */
export async function saveChatHistory(
  config: ChatHistorySaveConfig
): Promise<ChatHistoryResult> {
  // Если сохранение истории отключено, возвращает успешный результат
  if (config.requestContext.saveHistory === false) {
    return {
      userMessageSaved: true,
      assistantMessageSaved: true,
    };
  }

  try {
    if (!config.requestContext.chatId) {
      return {
        userMessageSaved: false,
        assistantMessageSaved: false,
        errors: ['Chat ID is required for saving history'],
      };
    }

    // Сохраняет сообщения последовательно
    // Сначала пользователя (если не сохранено ранее), потом ассистента для обеспечения правильного порядка
    let userResult: PromiseSettledResult<boolean>;
    let assistantResult: PromiseSettledResult<boolean>;

    // Сохраняет сообщение пользователя только если оно не null
    if (config.userMessage !== null) {
      try {
        const userValue = await saveUserMessage(config);
        userResult = { status: 'fulfilled' as const, value: userValue };
      } catch (reason) {
        userResult = { status: 'rejected' as const, reason };
      }
    } else {
      // Сообщение пользователя уже сохранено
      userResult = { status: 'fulfilled' as const, value: true };
    }

    try {
      const assistantValue = await saveAssistantMessage(config);
      assistantResult = { status: 'fulfilled' as const, value: assistantValue };
    } catch (reason) {
      assistantResult = { status: 'rejected' as const, reason };
    }

    const errors: string[] = [];
    let userMessageSaved = true;
    let assistantMessageSaved = true;

    // Обрабатывает результат сохранения сообщения пользователя
    if (userResult.status === 'rejected') {
      userMessageSaved = false;
      errors.push(
        `Failed to save user message: ${
          userResult.reason instanceof Error
            ? userResult.reason.message
            : 'Unknown error'
        }`
      );
    } else if (!userResult.value) {
      userMessageSaved = false;
      errors.push('Failed to save user message: Unknown error');
    }

    // Обрабатывает результат сохранения сообщения ассистента
    if (assistantResult.status === 'rejected') {
      assistantMessageSaved = false;
      errors.push(
        `Failed to save assistant message: ${
          assistantResult.reason instanceof Error
            ? assistantResult.reason.message
            : 'Unknown error'
        }`
      );
    } else if (!assistantResult.value) {
      assistantMessageSaved = false;
      errors.push('Failed to save assistant message: Unknown error');
    }

    // Логирует ошибки без прерывания выполнения
    if (errors.length > 0) {
      console.warn('[Chat History Saver]', errors.join('; '));
    }

    return {
      userMessageSaved,
      assistantMessageSaved,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    // Не прерывает выполнение при ошибках сохранения, только логирует
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.warn(
      `[Chat History Saver] Failed to save chat history: ${errorMessage}`
    );

    return {
      userMessageSaved: false,
      assistantMessageSaved: false,
      errors: [errorMessage],
    };
  }
}

/**
 * Сохраняет сообщение пользователя через IPC.
 *
 * @param config - Конфигурация для сохранения истории.
 * @returns Успешно ли сохранено сообщение.
 */
async function saveUserMessage(
  config: ChatHistorySaveConfig
): Promise<boolean> {
  try {
    if (!config.requestContext.chatId) {
      return false;
    }

    const result = await chatIpc.addMessage({
      chatId: config.requestContext.chatId,
      role: 'user',
      content: config.userMessage?.content || '',
    });

    if (!result.success) {
      console.warn(
        `[Chat History Saver] Failed to save user message: ${result.error}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      `[Chat History Saver] Failed to save user message: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
    return false;
  }
}

/**
 * Сохраняет сообщение ассистента через IPC.
 *
 * @param config - Конфигурация для сохранения истории.
 * @returns Успешно ли сохранено сообщение.
 */
async function saveAssistantMessage(
  config: ChatHistorySaveConfig
): Promise<boolean> {
  try {
    if (!config.requestContext.chatId) {
      return false;
    }

    const result = await chatIpc.addMessage({
      chatId: config.requestContext.chatId,
      role: 'assistant',
      content: config.assistantMessage.content,
      model: config.assistantMessage.model,
    });

    if (!result.success) {
      console.warn(
        `[Chat History Saver] Failed to save assistant message: ${result.error}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      `[Chat History Saver] Failed to save assistant message: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
    return false;
  }
}
