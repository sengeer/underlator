/**
 * @module ChatResponseHandler
 * Обработка streaming ответов для режима чата.
 * Обеспечивает создание обработчика streaming, накопление ответа и вызов callbacks.
 */

import type {
  IpcResponse,
  ModelRequestContext,
} from '../../hooks/use-model/types/feature-provider';
import callANotificationWithALog from '../../utils/call-a-notification-with-a-log';
import type { StreamingResponseHandler } from './types/chat-handlers';

/**
 * Создает обработчик streaming ответов.
 * Накапливает полный ответ и вызывает callback для каждого чанка.
 * Обновление Redux state для чата обрабатывается в use-model.ts через handleResponse.
 *
 * @param context - Контекст запроса к модели.
 * @returns Обработчик streaming ответов.
 */
export function createStreamingHandler(
  context: ModelRequestContext
): StreamingResponseHandler {
  let fullResponse = '';

  return {
    get fullResponse() {
      return fullResponse;
    },

    handleChunk: (chunk: string) => {
      if (chunk) {
        fullResponse += chunk;

        // Вызывает callback для streaming отображения
        // Логика обновления Redux state для чата обрабатывается в use-model.ts через handleResponse
        if (context.onModelResponse) {
          context.onModelResponse(chunk);
        }
      }
    },

    handleError: (error: string) => {
      callANotificationWithALog(
        context.dispatch,
        context.t`Chat generation error`,
        `Streaming error in chat: ${error}`
      );
    },
  };
}

/**
 * Обрабатывает IPC ответ и вызывает соответствующий метод обработчика.
 *
 * @param chunk - IPC ответ от модели.
 * @param handler - Обработчик streaming ответов.
 */
export function handleStreamingChunk(
  chunk: IpcResponse,
  handler: StreamingResponseHandler
): void {
  if (chunk.response) {
    handler.handleChunk(chunk.response);
  }

  if (chunk.error) {
    handler.handleError(chunk.error);
  }
}

/**
 * Накапливает полный ответ из streaming чанков.
 *
 * @param handler - Обработчик streaming ответов.
 * @returns Накопленный полный ответ.
 */
export function accumulateResponse(handler: StreamingResponseHandler): string {
  return handler.fullResponse;
}
