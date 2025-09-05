import {
  prepareContextualTranslation,
  processContextualResponse,
} from '../../utils/chunk-text-manager';

// HOF for creating contextual translation handler for any provider
const createContextualTranslationHandler = <TApiResponse>(
  apiCall: (
    prompt: string,
    params: Params,
    signal?: AbortSignal
  ) => Promise<TApiResponse>,
  responseProcessor: (
    response: TApiResponse,
    onChunk?: (chunkResponse: string) => void,
    onError?: (error: string, line?: string) => void
  ) => Promise<string>
) => {
  return async (
    texts: string[],
    translateLanguage: string,
    params: Params,
    signal?: AbortSignal,
    onModelResponse?: (response: ModelResponse) => void
  ): Promise<Record<number, string>> => {
    const sourceLanguage = translateLanguage.split('-')[0];
    const targetLanguage = translateLanguage.split('-')[1];

    // Prepare contextual translation
    const preparation = prepareContextualTranslation(
      texts,
      sourceLanguage,
      targetLanguage
    );

    if (!preparation.success) {
      throw new Error(
        `Failed to prepare contextual translation: ${preparation.error}`
      );
    }

    const { prompt } = preparation.data;

    // Make API call
    const response = await apiCall(prompt, params, signal);
    if (!response) {
      throw new Error('Failed to get response for contextual translation');
    }

    let fullResponse = '';

    // Process the response stream
    const finalResponse = await responseProcessor(
      response,
      (chunkResponse: string) => {
        fullResponse += chunkResponse;

        // Try to process partial response and update individual chunks
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
        console.warn('Failed to parse chunk:', error, line);
      }
    );

    // Final processing
    const finalResult = processContextualResponse(finalResponse, texts.length);

    if (!finalResult.success) {
      console.warn(
        `Contextual translation processing failed: ${finalResult.error}`
      );
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
