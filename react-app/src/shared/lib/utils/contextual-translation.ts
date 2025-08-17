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

// Pure function for validating contextual translation parameters
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
