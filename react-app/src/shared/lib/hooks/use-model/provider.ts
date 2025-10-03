/**
 * @module Provider
 * Провайдер для реализации возможностей обработки запроса к LLM.
 * Поддерживает контекстный перевод, инструкции и простой перевод.
 */

import { useLingui } from '@lingui/react/macro';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../../models/notifications-slice/';
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
} from './types/provider';

/**
 * Обрабатывает контекстный перевод через Electron IPC.
 *
 * @param props - Контекст запроса. Подробнее см. ModelRequestContext.
 * @returns Promise с результатом контекстного перевода.
 */
async function handleContextualTranslation(
  props: ModelRequestContext
): Promise<ContextualTranslationResult> {
  const dispatch = useDispatch();
  const { t } = useLingui();

  // Валидация параметров контекстного перевода
  const config = getContextualTranslationConfig('Embedded Ollama');
  const validation = validateContextualTranslationParams(
    Array.isArray(props.text) ? props.text : [props.text],
    config
  );

  if (!validation.valid) {
    dispatch(
      addNotification({
        type: 'error',
        message: t`Translation error`,
      })
    );

    console.warn(
      `Contextual translation validation failed: ${validation.reason}`
    );
    throw new Error(
      `Contextual translation not possible: ${validation.reason}`
    );
  }

  const sourceLanguage = props.translateLanguage.split('-')[0];
  const targetLanguage = props.translateLanguage.split('-')[1];

  // Подготовка контекстного перевода
  const preparation = prepareContextualTranslation(
    Array.isArray(props.text) ? props.text : [props.text],
    sourceLanguage,
    targetLanguage
  );

  if (!preparation.success) {
    dispatch(
      addNotification({
        type: 'error',
        message: t`Translation error`,
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
      dispatch(
        addNotification({
          type: 'error',
          message: t`Translation error`,
        })
      );

      throw new Error(`Contextual translation failed: ${chunk.error}`);
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
      dispatch(
        addNotification({
          type: 'error',
          message: t`Translation error`,
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

  const dispatch = useDispatch();
  const { t } = useLingui();

  // Подписка на прогресс генерации через IPC
  const unsubscribe = electron.onGenerateProgress((chunk: IpcResponse) => {
    if (chunk.response && props.onModelResponse) {
      props.onModelResponse(chunk.response);
    }

    if (chunk.error) {
      dispatch(
        addNotification({
          type: 'error',
          message: t`Failed to generate a response`,
        })
      );

      throw new Error(`Failed to generate a response: ${chunk.error}`);
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
  const sourceLanguage = props.translateLanguage.split('-')[0];
  const targetLanguage = props.translateLanguage.split('-')[1];

  const dispatch = useDispatch();
  const { t } = useLingui();

  // Формирование промпта для перевода
  const prompt = Array.isArray(props.text)
    ? `Translate the following ${sourceLanguage} texts to ${targetLanguage}:\n${props.text.join('\n')}`
    : `Translate the following ${sourceLanguage} text to ${targetLanguage}:\n${props.text}`;

  // Подписка на прогресс генерации через IPC
  const unsubscribe = electron.onGenerateProgress((chunk: IpcResponse) => {
    if (chunk.response && props.onModelResponse) {
      props.onModelResponse(chunk.response);
    }

    if (chunk.error) {
      dispatch(
        addNotification({
          type: 'error',
          message: t`Translation error`,
        })
      );

      throw new Error(`Translation error: ${chunk.error}`);
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
 * Основной провайдер для запросов к LLM модели.
 *
 * @param props - Контекст запроса. Подробнее см. ModelRequestContext.
 * @returns Promise с результатом генерации.
 */
export const provider = {
  generate: async (props: ModelRequestContext) => {
    // Обработка контекстного перевода для массивов
    if (
      props.params.useContextualTranslation &&
      props.typeUse === 'translation'
    ) {
      return await handleContextualTranslation(props);
    }

    // Обработка инструкций
    if (props.typeUse === 'instruction') {
      return await handleInstruction(props);
    }

    // Обработка простого перевода
    return await handleSimpleTranslation(props);
  },
};

export default provider;
