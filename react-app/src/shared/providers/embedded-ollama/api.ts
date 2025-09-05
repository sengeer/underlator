/**
 * @module EmbeddedOllamaApi
 * @description API для работы с Ollama через Electron IPC
 * Реализует провайдер для прямого взаимодействия с Ollama через Electron backend
 */

import {
  prepareContextualTranslation,
  processContextualResponse,
} from '../../lib/utils/chunk-text-manager';
import {
  getContextualTranslationConfig,
  validateContextualTranslationParams,
} from '../../lib/utils/contextual-translation';
import type { OllamaIpcResponse, ContextualTranslationResult } from './types';

/**
 * @description Конфигурация по умолчанию для Embedded Ollama
 * Настройки для оптимальной работы с Electron IPC
 */
const DEFAULT_CONFIG = {
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  maxChunksPerRequest: 50,
  ipcTimeout: 30000,
};

/**
 * @description Обрабатывает контекстный перевод через Electron IPC
 * Упрощенная версия без HOF (как в ollamaProvider) для прямого взаимодействия с IPC
 * @param chunks - Массив текстов для перевода
 * @param translateLanguage - Язык перевода (en-ru, ru-en)
 * @param model - Модель Ollama для использования
 * @param params - Параметры генерации
 * @param signal - AbortSignal для отмены операции
 * @param onModelResponse - Callback для обработки ответов
 * @returns Promise с результатом контекстного перевода
 */
async function handleContextualTranslation(
  chunks: string[],
  translateLanguage: string,
  model: string,
  params: Params,
  signal?: AbortSignal,
  onModelResponse?: (response: ModelResponse) => void
): Promise<ContextualTranslationResult> {
  // Валидация параметров контекстного перевода
  const config = getContextualTranslationConfig('Embedded Ollama');
  const validation = validateContextualTranslationParams(chunks, config);

  if (!validation.valid) {
    console.warn(
      `Contextual translation validation failed: ${validation.reason}`
    );
    throw new Error(
      `Contextual translation not possible: ${validation.reason}`
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
      `Failed to prepare contextual translation: ${preparation.error}`
    );
  }

  const { prompt } = preparation.data;

  let fullResponse = '';

  // Подписка на прогресс генерации через IPC
  const unsubscribe = window.electron.ollama.onGenerateProgress(
    (chunk: OllamaIpcResponse) => {
      if (chunk.response) {
        fullResponse += chunk.response;
      }

      if (chunk.error) {
        throw new Error(`Contextual translation failed: ${chunk.error}`);
      }
    }
  );

  try {
    // Запуск генерации через Electron IPC
    await window.electron.ollama.generate({
      model,
      prompt,
      temperature: params.temperature || DEFAULT_CONFIG.defaultTemperature,
      max_tokens: params.maxTokens || DEFAULT_CONFIG.defaultMaxTokens,
    });

    // Финальная обработка ответа
    const finalResult = processContextualResponse(fullResponse, chunks.length);

    if (!finalResult.success) {
      console.warn(
        `Contextual translation processing failed: ${finalResult.error}`
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
 * @description Обрабатывает инструкции через Electron IPC
 * Генерирует текст на основе инструкции и входного текста
 * @param text - Входной текст
 * @param model - Модель Ollama для использования
 * @param params - Параметры генерации
 * @param signal - AbortSignal для отмены операции
 * @param onModelResponse - Callback для обработки ответов
 */
async function handleInstruction(
  text: string,
  model: string,
  params: Params,
  signal?: AbortSignal,
  onModelResponse?: (response: ModelResponse) => void
): Promise<void> {
  const finalPrompt = `${params.instruction}: ${text}`;

  // Подписка на прогресс генерации через IPC
  const unsubscribe = window.electron.ollama.onGenerateProgress(
    (chunk: OllamaIpcResponse) => {
      if (chunk.response && onModelResponse) {
        onModelResponse(chunk.response);
      }

      if (chunk.error) {
        throw new Error(`Instruction generation failed: ${chunk.error}`);
      }
    }
  );

  try {
    // Запуск генерации через Electron IPC
    await window.electron.ollama.generate({
      model,
      prompt: finalPrompt,
      temperature: params.temperature || DEFAULT_CONFIG.defaultTemperature,
      max_tokens: params.maxTokens || DEFAULT_CONFIG.defaultMaxTokens,
    });
  } finally {
    unsubscribe();
  }
}

/**
 * @description Обрабатывает простой перевод через Electron IPC
 * Генерирует перевод для одного текста или массива текстов
 * @param text - Текст или массив текстов для перевода
 * @param translateLanguage - Язык перевода
 * @param model - Модель Ollama для использования
 * @param params - Параметры генерации
 * @param signal - AbortSignal для отмены операции
 * @param onModelResponse - Callback для обработки ответов
 */
async function handleSimpleTranslation(
  text: string | string[],
  translateLanguage: string,
  model: string,
  params: Params,
  signal?: AbortSignal,
  onModelResponse?: (response: ModelResponse) => void
): Promise<void> {
  const sourceLanguage = translateLanguage.split('-')[0];
  const targetLanguage = translateLanguage.split('-')[1];

  // Формирование промпта для перевода
  const prompt = Array.isArray(text)
    ? `Translate the following ${sourceLanguage} texts to ${targetLanguage}:\n${text.join('\n')}`
    : `Translate the following ${sourceLanguage} text to ${targetLanguage}:\n${text}`;

  // Подписка на прогресс генерации через IPC
  const unsubscribe = window.electron.ollama.onGenerateProgress(
    (chunk: OllamaIpcResponse) => {
      if (chunk.response && onModelResponse) {
        onModelResponse(chunk.response);
      }

      if (chunk.error) {
        throw new Error(`Translation failed: ${chunk.error}`);
      }
    }
  );

  try {
    // Запуск генерации через Electron IPC
    await window.electron.ollama.generate({
      model,
      prompt,
      temperature: params.temperature || DEFAULT_CONFIG.defaultTemperature,
      max_tokens: params.maxTokens || DEFAULT_CONFIG.defaultMaxTokens,
    });
  } finally {
    unsubscribe();
  }
}

/**
 * @description Основной провайдер Embedded Ollama
 * Реализует ModelUseProvider для работы через Electron IPC
 * Поддерживает контекстный перевод, инструкции и простой перевод
 */
export const embeddedOllamaProvider: ModelUseProvider = {
  /**
   * @description Генерирует текст через Ollama API
   * Поддерживает как строки, так и массивы строк
   * Обрабатывает контекстный перевод и инструкции
   * @param options - Опции генерации
   */
  generate: async ({
    text,
    translateLanguage,
    model,
    onModelResponse,
    typeUse,
    signal,
    params,
  }: GenerateOptions) => {
    if (!model) {
      throw new Error('Ollama model is not specified');
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
        params,
        signal,
        onModelResponse
      );
    }

    // Обработка инструкций
    if (params.instruction && typeof text === 'string') {
      return await handleInstruction(
        text,
        model,
        params,
        signal,
        onModelResponse
      );
    }

    // Обработка простого перевода
    return await handleSimpleTranslation(
      text,
      translateLanguage,
      model,
      params,
      signal,
      onModelResponse
    );
  },
};
