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
