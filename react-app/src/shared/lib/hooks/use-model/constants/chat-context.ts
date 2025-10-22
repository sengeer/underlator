/**
 * @module ChatContextConstants
 * Константы для работы с утилитами контекстом чата.
 * Определяет константы для работы с утилитами контекстом чата.
 */

import type { ProviderTokenLimits } from '../types/chat-context';

/**
 * Конфигурация провайдеров с лимитами токенов.
 */
export const PROVIDER_TOKEN_LIMITS: Record<string, ProviderTokenLimits> = {
  Ollama: {
    maxContextTokens: 4096,
    maxResponseTokens: 2048,
    reservedTokens: 200,
    maxMessages: 50,
  },
  'Embedded Ollama': {
    maxContextTokens: 4096,
    maxResponseTokens: 2048,
    reservedTokens: 200,
    maxMessages: 50,
  },
};
