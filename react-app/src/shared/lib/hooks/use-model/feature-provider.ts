/**
 * @module FeatureProvider
 * Feature-провайдер для реализации специфичной обработки запроса к LLM.
 * Поддерживает контекстный перевод, инструкции, чат и простой перевод.
 */

import { electron as chatElectron } from '../../../apis/chat-ipc/chat-ipc';
import { electron as ragElectron } from '../../../apis/rag-ipc/';
import { DEFAULT_MODEL } from '../../constants';
import callANotificationWithALog from '../../utils/call-a-notification-with-a-log';
import {
  prepareContextualTranslation,
  processContextualResponse,
} from '../../utils/chunk-text-manager/chunk-text-manager';
import {
  getContextualTranslationConfig,
  validateContextualTranslationParams,
} from '../../utils/contextual-translation';
import { electron } from './apis/model-ipc';
import type {
  IpcResponse,
  ContextualTranslationResult,
  ModelRequestContext,
} from './types/feature-provider.ts';
import type { ChatMessage, ChatContext } from './types/use-model';
import {
  buildChatPrompt,
  getProviderTokenLimits,
  calculateChatContextTokens,
  validateChatContext,
} from './utils/chat-context';

/**
 * Обрабатывает контекстный перевод через Electron IPC.
 *
 * @param props - Контекст запроса. Подробнее см. ModelRequestContext.
 * @returns Promise с результатом контекстного перевода.
 */
async function handleContextualTranslation(
  props: ModelRequestContext
): Promise<ContextualTranslationResult> {
  // Валидация параметров контекстного перевода
  const config = getContextualTranslationConfig('Embedded Ollama');
  const validation = validateContextualTranslationParams(
    Array.isArray(props.text) ? props.text : [props.text],
    config
  );

  if (!validation.valid) {
    const error = `Contextual translation validation failed: ${validation.reason}`;

    callANotificationWithALog(
      props.dispatch,
      props.t`Translation error`,
      error
    );

    throw new Error(error);
  }

  // Подготовка контекстного перевода
  const preparation = prepareContextualTranslation(
    Array.isArray(props.text) ? props.text : [props.text],
    props.sourceLanguage,
    props.targetLanguage
  );

  if (!preparation.success) {
    const error = `Failed to prepare contextual translation: ${preparation.error}`;

    callANotificationWithALog(
      props.dispatch,
      props.t`Translation error`,
      error
    );

    throw new Error(error);
  }

  const { prompt } = preparation.data;

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

      // Не бросает исключение в callback, так как это не остановит основной промис
      // Ошибка будет обработана в основном блоке try-catch
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
 * Генерирует текст на основе инструкции и входного текста.
 *
 * @param props - Контекст запроса. Подробнее см. ModelRequestContext.
 * @returns Promise с результатом генерации инструкции.
 */
async function handleInstruction(props: ModelRequestContext): Promise<void> {
  const finalPrompt = `${props.params.instruction}: ${props.text}`;

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

      // Не бросает исключение в callback, так как это не остановит основной промис
    }
  });

  try {
    // Запуск генерации через Electron IPC
    await electron.generate(
      {
        model: props.model || DEFAULT_MODEL,
        prompt: finalPrompt,
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
 * Генерирует перевод для одного текста или массива текстов.
 *
 * @param props - Контекст запроса к модели. Подробнее см. ModelRequestContext.
 * @returns Promise с результатом генерации простого перевода.
 */
async function handleSimpleTranslation(
  props: ModelRequestContext
): Promise<void> {
  // Формирование промпта для перевода
  const prompt = `Translate from ${props.sourceLanguage} to ${props.targetLanguage} the text after the colon, and return only the translated text:${props.text}`;
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

      // Не бросает исключение в callback, так как это не остановит основной промис
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
  // Валидация обязательных параметров для режима чата
  if (!props.chatId) {
    const error = 'Chat ID is required for chat mode';

    callANotificationWithALog(
      props.dispatch,
      props.t`Chat ID is required for chat mode`,
      error
    );

    throw new Error(error);
  }

  const message =
    typeof props.text === 'string' ? props.text : props.text.join(' ');

  let ragContext: string = '';

  try {
    const result = await ragElectron.getCollectionStats(props.chatId);

    if (result.sizeBytes > 0) {
      try {
        const searchResult = await ragElectron.queryDocuments({
          query: message,
          chatId: props.chatId,
          // NOTE: порог схожести и количество результатов можно изменить в зависимости от задачи
          topK: 3, // Количество результатов уменьщено для более точного поиска
          similarityThreshold: 0.3, // Порог схожести снижен для лучшего поиска
        });

        // Формирует промпт с контекстом из документов
        const context = searchResult.sources
          .map((source: any, index: number) => {
            // Извлекает текстовое содержимое из source
            const content =
              typeof source === 'string'
                ? source
                : source.content || JSON.stringify(source);
            return `${index + 1}. ${content}`;
          })
          .join('\n\n');

        ragContext = context;
      } catch (error) {
        const errMsg = `Failed getting RAG context: ${(error as Error).message}`;

        callANotificationWithALog(
          props.dispatch,
          props.t`Failed getting RAG context`,
          errMsg
        );

        throw new Error(errMsg);
      }
    }
  } catch (error) {
    const errMsg = `Failed getting RAG stats: ${(error as Error).message}`;

    callANotificationWithALog(
      props.dispatch,
      props.t`Failed getting RAG stats`,
      errMsg
    );

    throw new Error(errMsg);
  }

  let chatContext: ChatContext;

  // Загружает контекст из файловой системы
  try {
    const chatResult = await chatElectron.getChat({ chatId: props.chatId });

    if (!chatResult.success || !chatResult.data) {
      const error = `Failed to load chat context: ${chatResult.error}`;

      callANotificationWithALog(
        props.dispatch,
        props.t`Failed to load chat context`,
        error
      );

      throw new Error(error);
    }

    chatContext = {
      messages: chatResult.data.messages || [],
      maxContextMessages: 50,
      systemPrompt:
        'You are a helpful assistant. Answer the user’s questions using the context of previous messages.',
      generationSettings: {
        temperature: 0.7,
        maxTokens: 2048,
      },
    };
  } catch (error) {
    const errMsg = `Chat context loading failed: ${(error as Error).message}`;

    callANotificationWithALog(
      props.dispatch,
      props.t`Failed to load chat context`,
      errMsg
    );

    throw new Error(errMsg);
  }

  // Валидация контекста чата
  const contextValidation = validateChatContext(chatContext);
  if (!contextValidation.success) {
    const error = `Invalid chat context: ${contextValidation.error}`;

    callANotificationWithALog(
      props.dispatch,
      props.t`Invalid chat context`,
      error
    );

    throw new Error(error);
  }

  // Создание сообщения пользователя
  const userMessage: ChatMessage = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  };

  // Добавление сообщения пользователя в контекст
  const updatedContext: ChatContext = {
    ...chatContext,
    messages: [...chatContext.messages, userMessage],
  };

  // Получение лимитов токенов для провайдера
  const providerLimits = getProviderTokenLimits(props.config.id);
  const currentTokens = calculateChatContextTokens(updatedContext);

  // Проверка превышения лимитов и применение суммирования при необходимости
  if (currentTokens > providerLimits.maxContextTokens) {
    console.warn(
      `Context tokens (${currentTokens}) exceed limit (${providerLimits.maxContextTokens}). Applying summarization.`
    );

    // Применяем суммирование контекста
    const summarizationResult = buildChatPrompt(updatedContext, ragContext, {
      provider: props.config.id,
      maxContextTokens: providerLimits.maxContextTokens,
      enableSummarization: true,
      preserveRecentMessages: 5,
    });

    if (!summarizationResult.success) {
      const error = `Context summarization failed: ${summarizationResult.error}`;

      callANotificationWithALog(
        props.dispatch,
        props.t`Failed to process chat context`,
        error
      );

      throw new Error(error);
    }
  }

  // Построение промпта для чата
  const promptResult = buildChatPrompt(updatedContext, ragContext, {
    provider: props.config.id,
    systemPrompt: updatedContext.systemPrompt,
    maxContextTokens: providerLimits.maxContextTokens,
    enableSummarization: true,
    preserveRecentMessages: 5,
  });

  if (!promptResult.success) {
    const error = `Prompt building failed: ${promptResult.error}`;

    callANotificationWithALog(
      props.dispatch,
      props.t`Failed to build chat prompt`,
      error
    );

    throw new Error(error);
  }

  const prompt = promptResult.data;

  let fullResponse = '';

  // Подписка на прогресс генерации через IPC
  const unsubscribe = electron.onGenerateProgress((chunk: IpcResponse) => {
    if (chunk.response) {
      fullResponse += chunk.response;

      // Передает частичный ответ в callback для streaming отображения
      if (props.onModelResponse) {
        props.onModelResponse(chunk.response);
      }
    }

    if (chunk.error) {
      const error = `Streaming error in chat: ${chunk.error}`;

      callANotificationWithALog(
        props.dispatch,
        props.t`Chat generation error`,
        error
      );

      throw new Error(error);
    }
  });

  console.log('Cобранный окончательный промпт: ', prompt);

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

    // Создание сообщения ассистента
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date().toISOString(),
      model: {
        name: props.model || DEFAULT_MODEL,
        provider: props.config.id,
      },
    };

    // Сохранение ответа в контексте чата через IPC API
    if (props.saveHistory !== false) {
      try {
        // Добавляет сообщение пользователя
        const addUserMessageResult = await chatElectron.addMessage({
          chatId: props.chatId,
          role: 'user',
          content: userMessage.content,
        });

        if (!addUserMessageResult.success) {
          console.warn(
            `Failed to save user message: ${addUserMessageResult.error}`
          );
        }

        // Добавляет сообщение ассистента
        const addAssistantMessageResult = await chatElectron.addMessage({
          chatId: props.chatId,
          role: 'assistant',
          content: assistantMessage.content,
          model: assistantMessage.model,
        });

        if (!addAssistantMessageResult.success) {
          console.warn(
            `Failed to save assistant message: ${addAssistantMessageResult.error}`
          );
        }
      } catch (error) {
        // Не прерывает выполнение при ошибках сохранения, только логирует
        console.warn(
          `Failed to save chat messages: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
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
