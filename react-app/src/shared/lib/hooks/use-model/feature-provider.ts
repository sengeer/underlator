/**
 * @module FeatureProvider
 * Feature-провайдер для реализации специфичной обработки запроса к LLM.
 * Поддерживает контекстный перевод, инструкции, чат и простой перевод.
 */

import { electron as chatElectron } from '../../../apis/chat-ipc/chat-ipc';
import { addNotification } from '../../../models/notifications-slice';
import { DEFAULT_MODEL } from '../../constants';
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
    props.dispatch(
      addNotification({
        type: 'error',
        message: props.t`Translation error`,
      })
    );

    console.warn(
      `Contextual translation validation failed: ${validation.reason}`
    );
    throw new Error(
      `Contextual translation not possible: ${validation.reason}`
    );
  }

  // Подготовка контекстного перевода
  const preparation = prepareContextualTranslation(
    Array.isArray(props.text) ? props.text : [props.text],
    props.sourceLanguage,
    props.targetLanguage
  );

  if (!preparation.success) {
    props.dispatch(
      addNotification({
        type: 'error',
        message: props.t`Translation error`,
      })
    );

    throw new Error(
      `Failed to prepare contextual translation: ${preparation.error}`
    );
  }

  const { prompt } = preparation.data;

  let fullResponse = '';

  // Подписка на прогресс генерации через IPC
  const unsubscribe = electron.onGenerateProgress((chunk: IpcResponse) => {
    if (chunk.response) {
      fullResponse += chunk.response;
    }

    if (chunk.error) {
      props.dispatch(
        addNotification({
          type: 'error',
          message: props.t`Translation error`,
        })
      );

      // Не бросает исключение в callback, так как это не остановит основной промис
      // Ошибка будет обработана в основном блоке try-catch
      console.error(
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
      props.dispatch(
        addNotification({
          type: 'error',
          message: props.t`Translation error`,
        })
      );

      console.warn(
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
      props.dispatch(
        addNotification({
          type: 'error',
          message: props.t`Failed to generate a response`,
        })
      );

      // Не бросает исключение в callback, так как это не остановит основной промис
      console.error(`Streaming error in instruction: ${chunk.error}`);
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
      props.dispatch(
        addNotification({
          type: 'error',
          message: props.t`Translation error`,
        })
      );

      // Не бросает исключение в callback, так как это не остановит основной промис
      console.error(`Streaming error in simple translation: ${chunk.error}`);
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
    props.dispatch(
      addNotification({
        type: 'error',
        message: props.t`Chat ID is required for chat mode`,
      })
    );
    throw new Error('Chat ID is required for chat mode');
  }

  let chatContext: ChatContext;

  // Загрузка контекста чата через IPC API
  if (props.chatContext) {
    // Используем переданный контекст
    chatContext = props.chatContext;
  } else {
    // Загружаем контекст из файловой системы
    try {
      const chatResult = await chatElectron.getChat({ chatId: props.chatId });

      if (!chatResult.success || !chatResult.data) {
        props.dispatch(
          addNotification({
            type: 'error',
            message: props.t`Failed to load chat context`,
          })
        );
        throw new Error(`Failed to load chat: ${chatResult.error}`);
      }

      chatContext = {
        messages: chatResult.data.messages || [],
        maxContextMessages: 50,
        systemPrompt:
          'Ты полезный ассистент. Отвечай на вопросы пользователя, используя контекст предыдущих сообщений.',
        generationSettings: {
          temperature: 0.7,
          maxTokens: 2048,
        },
      };
    } catch (error) {
      props.dispatch(
        addNotification({
          type: 'error',
          message: props.t`Failed to load chat context`,
        })
      );
      throw new Error(
        `Chat context loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Валидация контекста чата
  const contextValidation = validateChatContext(chatContext);
  if (!contextValidation.success) {
    props.dispatch(
      addNotification({
        type: 'error',
        message: props.t`Invalid chat context`,
      })
    );
    throw new Error(`Invalid chat context: ${contextValidation.error}`);
  }

  // Создание сообщения пользователя
  const userMessage: ChatMessage = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content: typeof props.text === 'string' ? props.text : props.text.join(' '),
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
    const summarizationResult = buildChatPrompt(updatedContext, {
      provider: props.config.id,
      maxContextTokens: providerLimits.maxContextTokens,
      enableSummarization: true,
      preserveRecentMessages: 5,
    });

    if (!summarizationResult.success) {
      props.dispatch(
        addNotification({
          type: 'error',
          message: props.t`Failed to process chat context`,
        })
      );
      throw new Error(
        `Context summarization failed: ${summarizationResult.error}`
      );
    }
  }

  // Построение промпта для чата
  const promptResult = buildChatPrompt(updatedContext, {
    provider: props.config.id,
    systemPrompt: updatedContext.systemPrompt,
    maxContextTokens: providerLimits.maxContextTokens,
    enableSummarization: true,
    preserveRecentMessages: 5,
  });

  if (!promptResult.success) {
    props.dispatch(
      addNotification({
        type: 'error',
        message: props.t`Failed to build chat prompt`,
      })
    );
    throw new Error(`Prompt building failed: ${promptResult.error}`);
  }

  const prompt = promptResult.data;

  let fullResponse = '';

  // Подписка на прогресс генерации через IPC
  const unsubscribe = electron.onGenerateProgress((chunk: IpcResponse) => {
    if (chunk.response) {
      fullResponse += chunk.response;

      // Передаем частичный ответ в callback для streaming отображения
      if (props.onModelResponse) {
        props.onModelResponse(chunk.response);
      }
    }

    if (chunk.error) {
      props.dispatch(
        addNotification({
          type: 'error',
          message: props.t`Chat generation error`,
        })
      );
      console.error(`Streaming error in chat: ${chunk.error}`);
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
        // Добавляем сообщение пользователя
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

        // Добавляем сообщение ассистента
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
        // Не прерываем выполнение при ошибках сохранения, только логируем
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
 *
 * @param props - Контекст запроса. Подробнее см. ModelRequestContext.
 * @returns Promise с результатом генерации.
 */
export const featureProvider = {
  generate: async (props: ModelRequestContext) => {
    // Обработка чата с контекстом
    if (props.typeUse === 'chat') {
      return await handleChat(props);
    }

    // Обработка контекстного перевода для массивов
    if (props.typeUse === 'contextualTranslation') {
      return await handleContextualTranslation(props);
    }

    // Обработка инструкций
    if (props.typeUse === 'instruction') {
      return await handleInstruction(props);
    }

    // Обработка простого перевода
    if (props.typeUse === 'translation') {
      return await handleSimpleTranslation(props);
    }
  },
};

export default featureProvider;
