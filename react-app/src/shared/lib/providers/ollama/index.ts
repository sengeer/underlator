import { OllamaApi } from '../../../apis/ollama';
import { TranslationProvider, GenerateOptions } from '../types';

export const ollamaProvider: TranslationProvider = {
  generate: async ({
    text,
    translateLanguage,
    model,
    url,
    onChunk,
    typeUse,
    prompt,
    signal,
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

        if (typeUse === 'instruction' && prompt) {
          finalPrompt = `${prompt}: ${singleText}`;
        } else {
          finalPrompt = `Translate from ${translateLanguage.split('-')[0]} to ${
            translateLanguage.split('-')[1]
          } the text after the colon, and return only the translated text: "${singleText}"`;
        }

        const response = await ollamaApi.generatePrompt(
          model,
          finalPrompt,
          signal
        );

        if (!response) {
          throw new Error(`Failed to get response for text at index ${index}`);
        }

        const reader = response.body?.getReader();
        let fullResponse = '';

        while (true) {
          if (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const { response: chunkResponse } = JSON.parse(chunk);

            if (onChunk) onChunk({ idx: index, text: chunkResponse });
            fullResponse += chunkResponse;
          }

          results[index] = fullResponse;
        }
      })
    );

    return results;
  },
};
