/**
 * @module ContextualTranslationTypes
 * Типы для контекстного перевода.
 * Определяет интерфейсы и типы для работы с контекстным переводом.
 */

/**
 * Конфигурация контекстного перевода для провайдера.
 * Содержит настройки поддержки контекстного перевода конкретным провайдером LLM.
 */
export interface ContextualTranslationConfig {
  /** Включена ли поддержка контекстного перевода */
  enabled: boolean;
  /** Максимальное количество фрагментов на один запрос */
  maxChunksPerRequest?: number;
}

/**
 * Решение о необходимости контекстного перевода.
 * Алгебраический тип для представления результата анализа необходимости
 * использования контекстного перевода с обоснованием решения.
 */
export type ContextualTranslationDecision =
  | { useContextual: true; reason: 'multiple_chunks' }
  | {
      useContextual: false;
      reason: 'single_chunk' | 'instruction_mode' | 'disabled';
    };
