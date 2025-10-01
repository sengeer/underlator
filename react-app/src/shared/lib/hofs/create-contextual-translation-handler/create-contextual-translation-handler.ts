/**
 * @module CreateContextualTranslationHandler
 * HOF для создания обработчика контекстного перевода.
 */

import {
  prepareContextualTranslation,
  processContextualResponse,
} from '../../utils/chunk-text-manager/chunk-text-manager';
import {
  ApiCallFunction,
  ResponseProcessorFunction,
  ContextualTranslationHandler,
  CreateContextualTranslationHandlerFunction,
} from './types/create-contextual-translation-handler';

/**
 * Высокоуровневая HOF функция для создания обработчика контекстного перевода,
 * который абстрагирует логику работы с различными провайдерами LLM. Обеспечивает единообразный
 * интерфейс для выполнения контекстного перевода независимо от конкретной реализации провайдера.
 *
 * Функция принимает два адаптера: apiCall для выполнения запросов к провайдеру и responseProcessor
 * для обработки ответов. Это позволяет использовать один и тот же обработчик с разными провайдерами
 * (Ollama, OpenAI, Anthropic и т.д.) без изменения основной логики.
 *
 * @param apiCall - Функция для выполнения API вызова к провайдеру LLM.
 * @param responseProcessor - Функция для обработки ответа от провайдера с поддержкой стриминга.
 * @returns Обработчик контекстного перевода, готовый к использованию.
 *
 * @example
 * Базовое использование с Ollama провайдером
 * const ollamaHandler = createContextualTranslationHandler(
 *   async (prompt, options, signal) => {
 *     return await ollamaApi.generatePrompt(model, prompt, options, signal);
 *   },
 *   async (response, onChunk, onError) => {
 *     // Обработка streaming ответа от Ollama
 *     return await processOllamaResponse(response, onChunk, onError);
 *   }
 * );
 *
 * const result = await ollamaHandler(
 *   ['Hello world', 'How are you?'],
 *   'en-ru',
 *   { responseMode: 'stringStream' }
 * );
 */
const createContextualTranslationHandler: CreateContextualTranslationHandlerFunction =
  <TApiResponse>(
    apiCall: ApiCallFunction<TApiResponse>,
    responseProcessor: ResponseProcessorFunction<TApiResponse>
  ): ContextualTranslationHandler => {
    return async (
      texts: string[],
      translateLanguage: string,
      options: OllamaGenerateOptions,
      signal?: AbortSignal,
      onModelResponse?: (response: ModelResponse) => void
    ): Promise<Record<number, string>> => {
      // Извлечение языков из строки формата "source-target"
      // Необходимо для корректной подготовки контекстного промпта
      const sourceLanguage = translateLanguage.split('-')[0];
      const targetLanguage = translateLanguage.split('-')[1];

      // Подготовка контекстного промпта для перевода
      // Объединяет все тексты в единый контекст для лучшего качества перевода
      const preparation = prepareContextualTranslation(
        texts,
        sourceLanguage,
        targetLanguage
      );

      if (!preparation.success) {
        throw new Error(
          `❌ Failed to prepare contextual translation: ${preparation.error}`
        );
      }

      const { prompt } = preparation.data;

      // Выполнение API запроса к провайдеру LLM
      // Использует переданный адаптер для взаимодействия с конкретным провайдером
      const response = await apiCall(prompt, options, signal);
      if (!response) {
        throw new Error('❌ Failed to get response for contextual translation');
      }

      let fullResponse = '';

      // Обработка стримингового ответа от провайдера
      // Позволяет получать частичные результаты и обновлять UI в реальном времени
      const finalResponse = await responseProcessor(
        response,
        (chunkResponse: string) => {
          fullResponse += chunkResponse;

          // Попытка обработки частичного ответа для обновления отдельных фрагментов
          // Это обеспечивает инкрементальное обновление перевода по мере поступления данных
          const processResult = processContextualResponse(
            fullResponse,
            texts.length
          );

          if (processResult.success && onModelResponse) {
            Object.entries(processResult.data).forEach(([idx, text]) => {
              onModelResponse({ idx: parseInt(idx, 10), text });
            });
          }
        },
        (error: string, line?: string) => {
          console.error('❌ Failed to parse chunk:', error, line);
        }
      );

      // Финальная обработка полного ответа
      // Обеспечивает корректный результат даже при ошибках парсинга
      const finalResult = processContextualResponse(
        finalResponse,
        texts.length
      );

      if (!finalResult.success) {
        console.error(
          `❌ Contextual translation processing failed: ${finalResult.error}`
        );
        // Fallback: возврат исходных текстов или полного ответа при ошибке парсинга
        // Предотвращает потерю данных при сбоях в обработке
        return texts.reduce(
          (acc, text, index) => {
            acc[index] = finalResponse || text;
            return acc;
          },
          {} as Record<number, string>
        );
      }

      return finalResult.data;
    };
  };

export default createContextualTranslationHandler;
