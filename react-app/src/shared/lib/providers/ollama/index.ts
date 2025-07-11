// react-app/src/shared/lib/translation-provider/providers/ollama.ts
import { generatePrompt } from '../../../apis/ollama';
import { TranslationProvider, GenerateOptions } from '../types';

export const ollamaProvider: TranslationProvider = {
  generate: async ({
    text,
    translateLanguage,
    model,
    onChunk,
  }: GenerateOptions) => {
    if (!model) {
      throw new Error('Ollama model is not specified');
    }

    const texts = Array.isArray(text) ? text : [text];
    const results: Record<number, string> = {};

    await Promise.all(
      texts.map(async (singleText, index) => {
        const prompt = `Translate from ${translateLanguage.split('-')[0]} to ${translateLanguage.split('-')[1]} the text after the colon, and return only the translated text: "${singleText}"`;
        const response = await generatePrompt(model, prompt);

        if (!response) {
          throw new Error(`Failed to get response for text at index ${index}`);
        }

        const reader = response.body?.getReader();
        while (true) {
          if (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const { response } = JSON.parse(chunk);

            if (onChunk) onChunk({ idx: index, text: response });
          }
        }
      })
    );

    return results;
  },
};
