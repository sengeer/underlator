import {
  prepareContextualTranslation,
  processContextualResponse,
} from './chunk-text-manager';

// Utility for contextual translation across different providers

export interface ContextualTranslationConfig {
  enabled: boolean;
  maxChunksPerRequest?: number;
}

// Algebraic type for contextual translation decision
export type ContextualTranslationDecision =
  | { useContextual: true; reason: 'multiple_chunks' }
  | {
      useContextual: false;
      reason: 'single_chunk' | 'instruction_mode' | 'disabled';
    };

// Pure function for determining if contextual translation should be used
export const shouldUseContextualTranslation = (
  text: string | string[],
  params: Params,
  typeUse?: string
): ContextualTranslationDecision => {
  // Don't use contextual translation for instruction mode
  if (typeUse === 'instruction') {
    return { useContextual: false, reason: 'instruction_mode' };
  }

  // Don't use if explicitly disabled
  if (params.useContextualTranslation === false) {
    return { useContextual: false, reason: 'disabled' };
  }

  // Don't use for single chunks
  if (!Array.isArray(text) || text.length <= 1) {
    return { useContextual: false, reason: 'single_chunk' };
  }

  // Use contextual translation for multiple chunks
  return { useContextual: true, reason: 'multiple_chunks' };
};

// HOF for creating contextual translation handler for any provider
export const createContextualTranslationHandler = <TApiResponse>(
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
      // Fallback: map original texts or use final response
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

export const getContextualTranslationConfig = (
  providerType: string
): ContextualTranslationConfig => {
  const configs: Record<string, ContextualTranslationConfig> = {
    Ollama: {
      enabled: true,
      maxChunksPerRequest: 50,
    },
    OpenRouter: {
      enabled: true,
      maxChunksPerRequest: 100,
    },
    'Electron IPC': {
      enabled: false,
    },
  };

  return (
    configs[providerType] || {
      enabled: false,
    }
  );
};

export const validateContextualTranslationParams = (
  texts: string[],
  config: ContextualTranslationConfig
): { valid: boolean; reason?: string } => {
  if (!config.enabled) {
    return {
      valid: false,
      reason: 'Provider does not support contextual translation',
    };
  }

  if (config.maxChunksPerRequest && texts.length > config.maxChunksPerRequest) {
    return {
      valid: false,
      reason: `Too many chunks: ${texts.length} > ${config.maxChunksPerRequest}`,
    };
  }

  if (texts.some((text) => text.trim().length === 0)) {
    return { valid: false, reason: 'Empty chunks detected' };
  }

  return { valid: true };
};
