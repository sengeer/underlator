/**
 * @module OllamaProvider
 * Провайдер для работы с Ollama API
 * Реализует ModelUseProvider для взаимодействия с Ollama через HTTP
 * Поддерживает контекстный перевод, инструкции и streaming ответы
 */

import createContextualTranslationHandler from '../../../hofs/create-contextual-translation-handler';
import {
  getContextualTranslationConfig,
  validateContextualTranslationParams,
} from '../../../utils/contextual-translation';
import processStream from '../../../utils/process-stream';
import { createOllamaChunkProcessor } from '../../../utils/safe-json-parser';
import { OllamaApi } from '../apis/ollama';
import { GenerateOptions } from '../types/ollama';

/**
 * Обрабатывает контекстный перевод через Ollama API.
 * Использует HOF для создания обработчика контекстного перевода.
 * @returns Promise с результатом перевода.
 */
async function handleContextualTranslation(
  chunks: string[],
  translateLanguage: string,
  ollamaApi: OllamaApi,
  model: string,
  params: Params,
  signal?: AbortSignal,
  onModelResponse?: (response: ModelResponse) => void
): Promise<Record<number, string>> {
  // Валидация параметров контекстного перевода
  const config = getContextualTranslationConfig('Ollama');

  // Результат валидации
  const validation = validateContextualTranslationParams(chunks, config);

  if (!validation.valid) {
    console.warn(
      `⚠️ Contextual translation validation failed: ${validation.reason}`
    );
    throw new Error(
      `❌ Contextual translation not possible: ${validation.reason}`
    );
  }

  // Обработчик контекстного перевода на основе HOF
  const contextualHandler = createContextualTranslationHandler<Response>(
    // Адаптер вызова Ollama API
    async (prompt: string, params: Params, signal?: AbortSignal) => {
      const response = await ollamaApi.generatePrompt(
        model,
        prompt,
        params,
        signal
      );
      if (!response) {
        throw new Error(
          '❌ Failed to get response from Ollama for contextual translation'
        );
      }
      return response;
    },

    // Обработчик streaming ответа
    async (
      response: Response,
      onChunk?: (chunk: string) => void,
      onError?: (error: string, line?: string) => void
    ) => {
      // Читатель потока ответа
      const reader = response.body?.getReader();

      // Накопленный полный ответ
      let fullResponse = '';

      // Процессор чанков Ollama
      const processChunk = createOllamaChunkProcessor(
        (chunkResponse: string) => {
          fullResponse += chunkResponse;
          // Пропускаем onChunk во время streaming для предотвращения дублирования
        },
        (error: string, line: string) => {
          onError?.(error, line);
        }
      );

      // Выполнение обработки потока
      if (reader) {
        await processStream(reader, (chunk) => {
          processChunk(chunk);
        });
      }

      // Финальное уведомление о чанке с полным ответом
      onChunk?.(fullResponse);

      return fullResponse;
    }
  );

  // Выполнение контекстного перевода
  return await contextualHandler(
    chunks,
    translateLanguage,
    params,
    signal,
    onModelResponse
  );
}

/**
 * Обрабатывает инструкции через Ollama API.
 * Генерирует текст на основе инструкции и входного текста.
 * @returns Promise с результатом генерации инструкции.
 */
async function handleInstruction(
  text: string,
  ollamaApi: OllamaApi,
  model: string,
  params: Params,
  signal?: AbortSignal,
  onModelResponse?: (response: ModelResponse) => void
) {
  const finalPrompt = `${params.instruction}: ${text}`;

  const response = await ollamaApi.generatePrompt(
    model,
    finalPrompt,
    params,
    signal
  );

  if (!response) {
    throw new Error(`❌ Failed to get response`);
  }

  const reader = response.body?.getReader();

  // Процессор чанков с использованием функциональной утилиты
  const processChunk = createOllamaChunkProcessor(
    (chunkResponse: string) => {
      if (onModelResponse) onModelResponse(chunkResponse);
    },
    (error: string, line: string) => {
      console.warn('⚠️ Failed to parse JSON chunk:', line, error);
    }
  );

  // Чтение потока
  await processStream(reader, (chunk) => {
    processChunk(chunk);
  });
}

/**
 * Основной провайдер Ollama.
 * Реализует ModelUseProvider для работы с Ollama API через HTTP.
 * Поддерживает контекстный перевод и инструкции.
 * @returns Promise с результатом генерации.
 */
export const ollamaProvider: ModelUseProvider = {
  generate: async ({
    text,
    translateLanguage,
    model,
    url,
    onModelResponse,
    typeUse,
    signal,
    params,
  }: GenerateOptions) => {
    if (!model) {
      throw new Error('❌ Ollama model is not specified');
    }

    const ollamaApi = new OllamaApi(url);

    // Использование контекстного перевода для массивов при включении
    if (
      params.useContextualTranslation &&
      Array.isArray(text) &&
      typeUse === 'translation'
    ) {
      return await handleContextualTranslation(
        text,
        translateLanguage,
        ollamaApi,
        model,
        params,
        signal,
        onModelResponse
      );
    }

    if (params.instruction && typeof text === 'string') {
      return await handleInstruction(
        text,
        ollamaApi,
        model,
        params,
        signal,
        onModelResponse
      );
    }
  },
};
