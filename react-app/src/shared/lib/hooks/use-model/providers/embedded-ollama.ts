/**
 * @module EmbeddedOllamaProvider
 * Основной провайдер Embedded Ollama.
 * Реализует ModelUseProvider для работы через Electron IPC.
 * Поддерживает контекстный перевод, инструкции и простой перевод.
 */

import {
  prepareContextualTranslation,
  processContextualResponse,
} from '../../../utils/chunk-text-manager/chunk-text-manager';
import {
  getContextualTranslationConfig,
  validateContextualTranslationParams,
} from '../../../utils/contextual-translation';
import { embeddedOllamaElectronApi } from '../apis/embedded-ollama';
import type {
  OllamaIpcResponse,
  ContextualTranslationResult,
} from '../types/embedded-ollama';

/**
 * Обрабатывает контекстный перевод через Electron IPC.
 * Упрощенная версия без HOF (как в ollamaProvider) для прямого взаимодействия с IPC.
 * @returns Promise с результатом контекстного перевода.
 */
async function handleContextualTranslation(
  chunks: string[],
  translateLanguage: string,
  model: string,
  options: OllamaGenerateOptions,
  onModelResponse?: (response: ModelResponse) => void
): Promise<ContextualTranslationResult> {
  // Валидация параметров контекстного перевода
  const config = getContextualTranslationConfig('Embedded Ollama');
  const validation = validateContextualTranslationParams(chunks, config);

  if (!validation.valid) {
    console.warn(
      `⚠️ Contextual translation validation failed: ${validation.reason}`
    );
    throw new Error(
      `❌ Contextual translation not possible: ${validation.reason}`
    );
  }

  const sourceLanguage = translateLanguage.split('-')[0];
  const targetLanguage = translateLanguage.split('-')[1];

  // Подготовка контекстного перевода
  const preparation = prepareContextualTranslation(
    chunks,
    sourceLanguage,
    targetLanguage
  );

  if (!preparation.success) {
    throw new Error(
      `❌ Failed to prepare contextual translation: ${preparation.error}`
    );
  }

  const { prompt } = preparation.data;

  let fullResponse = '';

  // Подписка на прогресс генерации через IPC
  const unsubscribe = embeddedOllamaElectronApi.onGenerateProgress(
    (chunk: OllamaIpcResponse) => {
      if (chunk.response) {
        fullResponse += chunk.response;
      }

      if (chunk.error) {
        throw new Error(`❌ Contextual translation failed: ${chunk.error}`);
      }
    }
  );

  try {
    // Запуск генерации через Electron IPC
    await embeddedOllamaElectronApi.generate({
      model,
      prompt,
      ...options,
    });

    // Финальная обработка ответа
    const finalResult = processContextualResponse(fullResponse, chunks.length);

    if (!finalResult.success) {
      console.warn(
        `⚠️ Contextual translation processing failed: ${finalResult.error}`
      );
      return chunks.reduce(
        (acc, text, index) => {
          acc[index] = fullResponse || text;
          return acc;
        },
        {} as Record<number, string>
      );
    }

    // Отправка финального результата через onModelResponse
    if (onModelResponse) {
      Object.entries(finalResult.data).forEach(([idx, text]) => {
        onModelResponse({ idx: parseInt(idx, 10), text });
      });
    }

    return finalResult.data;
  } finally {
    unsubscribe();
  }
}

/**
 * Обрабатывает инструкции через Electron IPC.
 * Генерирует текст на основе инструкции и входного текста.
 * @returns Promise с результатом генерации инструкции.
 */
async function handleInstruction(
  text: string,
  model: string,
  params: UseModelParams,
  options: OllamaGenerateOptions,
  onModelResponse?: (response: ModelResponse) => void
): Promise<void> {
  const finalPrompt = `${params.instruction}: ${text}`;

  // Подписка на прогресс генерации через IPC
  const unsubscribe = embeddedOllamaElectronApi.onGenerateProgress(
    (chunk: OllamaIpcResponse) => {
      if (chunk.response && onModelResponse) {
        onModelResponse(chunk.response);
      }

      if (chunk.error) {
        throw new Error(`❌ Instruction generation failed: ${chunk.error}`);
      }
    }
  );

  try {
    // Запуск генерации через Electron IPC
    await embeddedOllamaElectronApi.generate({
      model,
      prompt: finalPrompt,
      ...options,
    });
  } finally {
    unsubscribe();
  }
}

/**
 * Обрабатывает простой перевод через Electron IPC.
 * Генерирует перевод для одного текста или массива текстов.
 * @returns Promise с результатом генерации простого перевода.
 */
async function handleSimpleTranslation(
  text: string | string[],
  translateLanguage: string,
  model: string,
  params: UseModelParams,
  options: OllamaGenerateOptions,
  onModelResponse?: (response: ModelResponse) => void
): Promise<void> {
  const sourceLanguage = translateLanguage.split('-')[0];
  const targetLanguage = translateLanguage.split('-')[1];

  // Формирование промпта для перевода
  const prompt = Array.isArray(text)
    ? `Translate the following ${sourceLanguage} texts to ${targetLanguage}:\n${text.join('\n')}`
    : `Translate the following ${sourceLanguage} text to ${targetLanguage}:\n${text}`;

  // Подписка на прогресс генерации через IPC
  const unsubscribe = embeddedOllamaElectronApi.onGenerateProgress(
    (chunk: OllamaIpcResponse) => {
      if (chunk.response && onModelResponse) {
        onModelResponse(chunk.response);
      }

      if (chunk.error) {
        throw new Error(`❌ Translation failed: ${chunk.error}`);
      }
    }
  );

  try {
    // Запуск генерации через Electron IPC
    await embeddedOllamaElectronApi.generate({
      model,
      prompt,
      ...options,
    });
  } finally {
    unsubscribe();
  }
}

/**
 * Основной провайдер Embedded Ollama.
 * Реализует ModelUseProvider для работы через Electron IPC.
 * Поддерживает контекстный перевод, инструкции и простой перевод.
 * @returns Promise с результатом генерации.
 */
export const embeddedOllamaProvider: ModelUseProvider = {
  generate: async ({
    text,
    translateLanguage,
    model,
    onModelResponse,
    typeUse,
    params,
    options,
  }: GenerateOptions & ProviderSettings) => {
    if (!model) {
      throw new Error('❌ Ollama model is not specified');
    }

    // Обработка контекстного перевода для массивов
    if (
      params.useContextualTranslation &&
      Array.isArray(text) &&
      typeUse === 'translation'
    ) {
      return await handleContextualTranslation(
        text,
        translateLanguage,
        model,
        options,
        onModelResponse
      );
    }

    // Обработка инструкций
    if (params.instruction && typeof text === 'string') {
      return await handleInstruction(
        text,
        model,
        params,
        options,
        onModelResponse
      );
    }

    // Обработка простого перевода
    return await handleSimpleTranslation(
      text,
      translateLanguage,
      model,
      params,
      options,
      onModelResponse
    );
  },
};

export default embeddedOllamaProvider;
