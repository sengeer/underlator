/**
 * @module FeatureProvider
 * Feature-провайдер для реализации специфичной обработки запроса к LLM.
 * Поддерживает четыре режима: контекстный перевод, инструкции, чат и простой перевод.
 */

import {
  addMessageLocally,
  updateMessage,
} from '../../../models/chat-ipc-slice';
import { DEFAULT_MODEL } from '../../constants';
import callANotificationWithALog from '../../utils/call-a-notification-with-a-log';
import { loadChatContext } from '../../utils/chat-handlers/chat-context-loader';
import { saveChatHistory } from '../../utils/chat-handlers/chat-history-saver';
import { buildChatPromptWithContext } from '../../utils/chat-handlers/chat-prompt-builder';
import { loadRagContext } from '../../utils/chat-handlers/chat-rag-loader';
import {
  accumulateResponse,
  createStreamingHandler,
  handleStreamingChunk,
} from '../../utils/chat-handlers/chat-response-handler';
import { validateChatRequest } from '../../utils/chat-handlers/chat-validator';
import { processContextualResponse } from '../../utils/chunk-text-manager/chunk-text-manager';
import { prepareContextualData } from '../../utils/feature-handlers/contextual-translation-handler';
import { handleInstruction as handleInstructionHandler } from '../../utils/feature-handlers/instruction-handler';
import { handleSimpleTranslation as handleSimpleTranslationHandler } from '../../utils/feature-handlers/simple-translation-handler';
import log from '../../utils/log';
import { electron } from './apis/model-ipc';
import type {
  IpcResponse,
  ContextualTranslationResult,
  ModelRequestContext,
} from './types/feature-provider.ts';
import type { ChatMessage } from './types/use-model';

/**
 * Обрабатывает контекстный перевод через Electron IPC.
 * Использует translation handlers для соблюдения SRP.
 *
 * @param props - Контекст запроса. Подробнее см. в типе ModelRequestContext.
 * @returns Promise с результатом контекстного перевода.
 */
async function handleContextualTranslation(
  props: ModelRequestContext
): Promise<ContextualTranslationResult> {
  // Подготовка данных через handler
  const preparation = await prepareContextualData(props);
  log('Промпт ContextualTranslation:', preparation.prompt);

  if (!preparation.success || !preparation.prompt) {
    const error =
      preparation.error || 'Failed to prepare contextual translation';

    callANotificationWithALog(
      props.dispatch,
      props.t`Translation error`,
      error
    );

    throw new Error(error);
  }

  const prompt = preparation.prompt;
  let fullResponse = '';

  // Подписка на прогресс генерации через IPC
  const unsubscribe = electron.onGenerateProgress((chunk: IpcResponse) => {
    if (chunk.response) {
      fullResponse += chunk.response;
    }

    if (chunk.error) {
      callANotificationWithALog(
        props.dispatch,
        props.t`Translation error`,
        `Streaming error in contextual translation: ${chunk.error}`
      );
    }
  });

  try {
    // Запуск генерации через Electron IPC
    await electron.generate(
      {
        model: props.model || DEFAULT_MODEL,
        prompt,
        ...props.options,
      },
      props.config
    );

    // Финальная обработка ответа
    const textArray = Array.isArray(props.text) ? props.text : [props.text];
    const finalResult = processContextualResponse(
      fullResponse,
      textArray.length
    );

    if (!finalResult.success) {
      callANotificationWithALog(
        props.dispatch,
        props.t`Translation error`,
        `Contextual translation processing failed: ${finalResult.error}`
      );

      const textArray = Array.isArray(props.text) ? props.text : [props.text];
      return textArray.reduce(
        (acc: Record<number, string>, text: string, index: number) => {
          acc[index] = fullResponse || text;
          return acc;
        },
        {} as Record<number, string>
      );
    }

    // Отправка финального результата через onModelResponse
    if (props.onModelResponse && finalResult.data) {
      Object.entries(finalResult.data).forEach(([idx, text]) => {
        props.onModelResponse!({ idx: parseInt(idx, 10), text });
      });
    }

    return finalResult.data || ({} as Record<number, string>);
  } finally {
    unsubscribe();
  }
}

/**
 * Обрабатывает инструкции через Electron IPC.
 * Использует translation handlers для соблюдения SRP.
 *
 * @param props - Контекст запроса. Подробнее см. ModelRequestContext.
 * @returns Promise с результатом генерации инструкции.
 */
async function handleInstruction(props: ModelRequestContext): Promise<void> {
  // Получает промпт через handler
  const prompt = handleInstructionHandler(props);
  log('Промпт Instruction:', prompt);

  // Подписка на прогресс генерации через IPC
  const unsubscribe = electron.onGenerateProgress((chunk: IpcResponse) => {
    if (chunk.response && props.onModelResponse) {
      props.onModelResponse(chunk.response);
    }

    if (chunk.error) {
      callANotificationWithALog(
        props.dispatch,
        props.t`Failed to generate a response`,
        `Streaming error in instruction: ${chunk.error}`
      );
    }
  });

  try {
    // Запуск генерации через Electron IPC
    await electron.generate(
      {
        model: props.model || DEFAULT_MODEL,
        prompt,
        ...props.options,
      },
      props.config
    );
  } finally {
    unsubscribe();
  }
}

/**
 * Обрабатывает простой перевод через Electron IPC.
 * Использует translation handlers для соблюдения SRP.
 *
 * @param props - Контекст запроса к модели. Подробнее см. ModelRequestContext.
 * @returns Promise с результатом генерации простого перевода.
 */
async function handleSimpleTranslation(
  props: ModelRequestContext
): Promise<void> {
  // Получает промпт через handler
  const prompt = handleSimpleTranslationHandler(props);
  log('Промпт SimpleTranslation:', prompt);

  // Подписка на прогресс генерации через IPC
  const unsubscribe = electron.onGenerateProgress((chunk: IpcResponse) => {
    if (chunk.response && props.onModelResponse) {
      props.onModelResponse(chunk.response);
    }

    if (chunk.error) {
      callANotificationWithALog(
        props.dispatch,
        props.t`Translation error`,
        `Streaming error in simple translation: ${chunk.error}`
      );
    }
  });

  try {
    // Запуск генерации через Electron IPC
    await electron.generate(
      {
        model: props.model || DEFAULT_MODEL,
        prompt,
        ...props.options,
      },
      props.config
    );
  } finally {
    unsubscribe();
  }
}

/**
 * Обрабатывает чат через Electron IPC с поддержкой контекста и суммирования.
 * Загружает историю сообщений, строит контекстный промпт и сохраняет ответ в чат.
 *
 * @param props - Контекст запроса. Подробнее см. ModelRequestContext.
 * @returns Promise с результатом обработки чата.
 */
async function handleChat(props: ModelRequestContext): Promise<void> {
  // Валидация (ранний возврат при ошибках)
  const validation = validateChatRequest(props);
  if (!validation.success) {
    const error = validation.error || 'Chat request validation failed';

    callANotificationWithALog(
      props.dispatch,
      props.t`Chat request validation failed`,
      error
    );

    throw new Error(error);
  }

  const message =
    typeof props.text === 'string' ? props.text : props.text.join(' ');

  // Параллельная загрузка данных
  const [ragResult, chatContextResult] = await Promise.all([
    loadRagContext(props),
    loadChatContext(props),
  ]);

  if (!chatContextResult.success || !chatContextResult.context) {
    throw new Error(chatContextResult.error || 'Failed to load chat context');
  }

  const ragContext = ragResult.success ? ragResult.context || '' : '';
  const chatContext = chatContextResult.context;

  // Создание сообщения пользователя
  const userMessage: ChatMessage = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  };

  // Добавление сообщения пользователя в контекст
  const updatedContext = {
    ...chatContext,
    messages: [...chatContext.messages, userMessage],
  };

  // Построение промпта
  const promptResult = await buildChatPromptWithContext(
    updatedContext,
    ragContext,
    props
  );

  if (!promptResult.success || !promptResult.prompt) {
    const error = promptResult.error || 'Failed to build chat prompt';

    callANotificationWithALog(
      props.dispatch,
      props.t`Failed to build chat prompt`,
      error
    );

    throw new Error(error);
  }

  const prompt = promptResult.prompt;

  log('Промпт Chat:', prompt);

  // Создает временное сообщение ассистента сразу для стриминга
  const tempAssistantMessageId = `assistant-temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const tempAssistantMessage: ChatMessage = {
    id: tempAssistantMessageId,
    role: 'assistant',
    content: '', // Начнется с пустого контента, будет обновляться при стриминге
    timestamp: new Date().toISOString(),
    model: {
      name: props.model || DEFAULT_MODEL,
      provider: props.config.id,
    },
  };

  // Добавляет временное сообщение в Redux для отображения стриминга
  props.dispatch(
    addMessageLocally({
      chatId: props.chatId!,
      message: tempAssistantMessage,
    })
  );

  // Генерация ответа
  const responseHandler = createStreamingHandler(props);

  // Подписка на прогресс генерации через IPC
  const unsubscribe = electron.onGenerateProgress((chunk: IpcResponse) => {
    handleStreamingChunk(chunk, responseHandler);
    // currentText обновляется через use-model.ts -> handleResponse -> updateGenerationText
    // Временное сообщение отображается через currentText в chat-messages.tsx
  });

  try {
    // Запуск генерации через Electron IPC
    await electron.generate(
      {
        model: props.model || DEFAULT_MODEL,
        prompt,
        ...props.options,
      },
      props.config
    );

    // Получает полный ответ
    const fullResponse = accumulateResponse(responseHandler);

    // Проверка, что ответ не пустой
    if (!fullResponse || fullResponse.trim().length === 0) {
      const error = 'Empty response from model';

      callANotificationWithALog(
        props.dispatch,
        props.t`Chat generation error`,
        error
      );

      // Удаляет временное сообщение при ошибке
      if (props.chatId) {
        // Находит и удаляет временное сообщение из массива
        const activeChatState = (props.dispatch as any).getState?.()?.chat
          ?.activeChat;
        if (activeChatState?.chat?.id === props.chatId) {
          const messages = activeChatState.chat.messages;
          const tempMessageIndex = messages.findIndex(
            (msg: ChatMessage) => msg.id === tempAssistantMessageId
          );
          if (tempMessageIndex !== -1) {
            messages.splice(tempMessageIndex, 1);
          }
        }
      }

      throw new Error(error);
    }

    // Обновляет временное сообщение финальным контентом
    props.dispatch(
      updateMessage({
        chatId: props.chatId!,
        messageId: tempAssistantMessageId,
        content: fullResponse,
      })
    );

    // Создает финальное сообщение ассистента для сохранения в IPC
    const assistantMessage: ChatMessage = {
      ...tempAssistantMessage,
      id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: fullResponse,
    };

    // Сохранение истории (не блокирует при ошибках)
    await saveChatHistory({
      requestContext: props,
      userMessage: null, // Сообщение пользователя уже сохранено
      assistantMessage,
      fullResponse,
    });
  } finally {
    unsubscribe();
  }
}

/**
 * Feature-провайдер для запросов к LLM модели.
 */
export const featureProvider = {
  /**
   * Обрабатывает чат через Electron IPC.
   */
  chat: handleChat,

  /**
   * Обрабатывает контекстный перевод через Electron IPC.
   */
  contextualTranslate: handleContextualTranslation,

  /**
   * Обрабатывает инструкции через Electron IPC.
   */
  instruct: handleInstruction,

  /**
   * Обрабатывает простой перевод через Electron IPC.
   */
  translate: handleSimpleTranslation,
};

export default featureProvider;
