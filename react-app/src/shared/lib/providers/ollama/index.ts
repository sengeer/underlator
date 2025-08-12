import { OllamaApi } from '../../../apis/ollama';
import { createOllamaChunkProcessor } from '../../utils/safe-json-parser';
import { ModelUseProvider, GenerateOptions } from '../types';

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
      throw new Error('Ollama model is not specified');
    }

    const ollamaApi = new OllamaApi(url);
    const texts = Array.isArray(text) ? text : [text];
    const results: Record<number, string> = {};

    await Promise.all(
      texts.map(async (singleText, index) => {
        let finalPrompt: string;

        if (typeUse === 'instruction' && params.instruction) {
          finalPrompt = `${params.instruction}: ${singleText}`;
        } else {
          const sourceLanguage = translateLanguage.split('-')[0];
          const targetLanguage = translateLanguage.split('-')[1];

          finalPrompt = `Translate from ${sourceLanguage} to ${
            targetLanguage
          } the text after the colon, and return only the translated text: "${singleText}"`;
        }

        const response = await ollamaApi.generatePrompt(
          model,
          finalPrompt,
          params,
          signal
        );

        if (!response) {
          throw new Error(`Failed to get response for text at index ${index}`);
        }

        const reader = response.body?.getReader();
        let fullResponse = '';

        // Сhunk processor using a functional utility
        const processChunk = createOllamaChunkProcessor(
          (chunkResponse: string) => {
            if (onModelResponse)
              onModelResponse({ idx: index, text: chunkResponse });
            fullResponse += chunkResponse;
            results[index] = fullResponse;
          },
          (error: string, line: string) => {
            console.warn('Failed to parse JSON chunk:', line, error);
          }
        );

        while (true) {
          if (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            processChunk(chunk);
          }
        }
      })
    );

    return results;
  },
};
