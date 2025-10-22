/**
 * @module ChatContextTypes
 * Типы для работы с утилитами контекстом чата.
 * Определяет интерфейсы для работы с утилитами контекстом чата.
 */

import type { ChatMessage, ChatContext } from './use-model';

/**
 * Конфигурация лимитов токенов для различных провайдеров LLM.
 * Определяет максимальные значения контекста для каждого провайдера.
 */
export interface ProviderTokenLimits {
  /** Максимальное количество токенов в контексте */
  maxContextTokens: number;
  /** Максимальное количество токенов в ответе */
  maxResponseTokens: number;
  /** Резерв токенов для системного промпта и форматирования */
  reservedTokens: number;
  /** Максимальное количество сообщений в контексте */
  maxMessages?: number;
}

/**
 * Конфигурация для построения промпта чата.
 */
export interface ChatPromptConfig {
  /** Системный промпт для настройки поведения модели */
  systemPrompt?: string;
  /** Максимальная длина контекста в токенах */
  maxContextTokens?: number;
  /** Провайдер для определения лимитов */
  provider?: string;
  /** Включить ли суммирование при превышении лимитов */
  enableSummarization?: boolean;
  /** Сохранить ли последние N сообщений без суммирования */
  preserveRecentMessages?: number;
}

/**
 * Результат суммирования контекста.
 */
export interface SummarizationResult {
  /** Суммированный контекст */
  summary: string;
  /** Количество сообщений, которые были суммированы */
  summarizedMessagesCount: number;
  /** Сохраненные сообщения (не суммированные) */
  preservedMessages: ChatMessage[];
}

/**
 * Кэш для обработанного контекста.
 * Используется для оптимизации производительности.
 */
export interface ContextCache {
  /** Ключ кэша (хэш контекста) */
  key: string;
  /** Обработанный контекст */
  context: ChatContext;
  /** Временная метка создания */
  timestamp: number;
  /** Время жизни кэша в миллисекундах */
  ttl: number;
}
