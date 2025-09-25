import createContextualTranslationHandler from '../../../hofs/create-contextual-translation-handler';
import {
  getContextualTranslationConfig,
  validateContextualTranslationParams,
} from '../../../utils/contextual-translation';
import processStream from '../../../utils/process-stream';
import { createOllamaChunkProcessor } from '../../../utils/safe-json-parser';
import { OllamaApi } from '../apis/ollama';
import { GenerateOptions } from '../types/ollama';

async function handleContextualTranslation(
  chunks: string[],
  translateLanguage: string,
  ollamaApi: OllamaApi,
  model: string,
  params: Params,
  signal?: AbortSignal,
  onModelResponse?: (response: ModelResponse) => void
): Promise<Record<number, string>> {
  // Validate contextual translation parameters
  const config = getContextualTranslationConfig('Ollama');

  // Validation result
  const validation = validateContextualTranslationParams(chunks, config);

  if (!validation.valid) {
    console.warn(
      `⚠️ Contextual translation validation failed: ${validation.reason}`
    );
    throw new Error(
      `❌ Contextual translation not possible: ${validation.reason}`
    );
  }

  // Context translation handler based on HOF
  const contextualHandler = createContextualTranslationHandler<Response>(
    // The Ollama API call adapter
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

    // The streaming response handler
    async (
      response: Response,
      onChunk?: (chunk: string) => void,
      onError?: (error: string, line?: string) => void
    ) => {
      // Response stream reader
      const reader = response.body?.getReader();

      // Accumulated full response
      let fullResponse = '';

      // The Ollama chunk processor
      const processChunk = createOllamaChunkProcessor(
        (chunkResponse: string) => {
          fullResponse += chunkResponse;
          // Skip onChunk during streaming to prevent duplication
        },
        (error: string, line: string) => {
          onError?.(error, line);
        }
      );

      // Stream processing execution
      if (reader) {
        await processStream(reader, (chunk) => {
          processChunk(chunk);
        });
      }

      // Final notification of the chunk with the full response
      onChunk?.(fullResponse);

      return fullResponse;
    }
  );

  // Contextual translation execution
  return await contextualHandler(
    chunks,
    translateLanguage,
    params,
    signal,
    onModelResponse
  );
}

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

  // Сhunk processor using a functional utility
  const processChunk = createOllamaChunkProcessor(
    (chunkResponse: string) => {
      if (onModelResponse) onModelResponse(chunkResponse);
    },
    (error: string, line: string) => {
      console.warn('⚠️ Failed to parse JSON chunk:', line, error);
    }
  );

  // Read the stream
  await processStream(reader, (chunk) => {
    processChunk(chunk);
  });
}

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

    // Use contextual translation for arrays when enabled
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
