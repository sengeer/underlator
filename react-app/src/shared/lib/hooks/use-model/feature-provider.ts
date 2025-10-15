/**
 * @module FeatureProvider
 * Feature-провайдер для реализации обработки запроса к LLM.
 * Поддерживает контекстный перевод, инструкции и простой перевод.
 */

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
import { electron } from './apis/electron';
import type {
  IpcResponse,
  ContextualTranslationResult,
  ModelRequestContext,
} from './types/feature-provider.ts';

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
 * Feature-провайдер для запросов к LLM модели.
 *
 * @param props - Контекст запроса. Подробнее см. ModelRequestContext.
 * @returns Promise с результатом генерации.
 */
export const featureProvider = {
  generate: async (props: ModelRequestContext) => {
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
