/**
 * @module PromptManagerConstants
 * Константы и дефолтные шаблоны промптов для системы управления промптами.
 */

import type { PromptTemplate } from '../types/prompt-manager';

/**
 * Дефолтный шаблон промпта для контекстного перевода.
 */
export const DEFAULT_CONTEXTUAL_TRANSLATION_PROMPT: PromptTemplate = {
  id: 'default-contextual-translation',
  content: `
  [ROLE]
  You are a professional document translation engine.
  Your task is to translate technical/academic content while preserving ALL special markers.

  [RULES]
  1. STRICTLY preserve every occurrence of "{chunkDelimiter}" unchanged
  2. NEVER translate, modify, move, add or delete delimiter symbols
  3. Treat delimiters as INVIOABLE technical markers, not linguistic elements
  4. Maintain original spacing around delimiters exactly
  5. Translate text segments BETWEEN delimiters independently
  6. For incomplete sentences at segment boundaries:
    - Keep grammatical consistency with adjacent chunks
    - Preserve technical terms and proper names unchanged
  7. Output ONLY the translated text with preserved markers

  [CONTEXT]
  - Document type: 'PDF'
  - Source language: {sourceLanguage}
  - Target language: {targetLanguage}

  [EXAMPLE]
  Input: "Important{chunkDelimiter}safety{chunkDelimiter}information"
  Output: "Важная{chunkDelimiter}информация{chunkDelimiter}по безопасности"

  [INPUT TEXT]
  {combinedText}

  [TRANSLATION]
  `,
  metadata: {
    description:
      'Prompt for contextual translation with preservation of delimiters',
    mode: 'contextualTranslation',
    requiredPlaceholders: [
      'sourceLanguage',
      'targetLanguage',
      'chunkDelimiter',
      'combinedText',
    ],
    optionalPlaceholders: [],
    version: '1.0.0',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Дефолтный системный промпт для чата.
 */
export const DEFAULT_CHAT_SYSTEM_PROMPT: PromptTemplate = {
  id: 'default-chat-system',
  content: `You are a helpful assistant. Answer the user's questions using the context of previous messages.`,
  metadata: {
    description: 'System prompt for chat mode',
    mode: 'chat',
    requiredPlaceholders: [],
    optionalPlaceholders: [],
    version: '1.0.0',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Дефолтные правила для чата.
 */
export const DEFAULT_CHAT_RULES_PROMPT: PromptTemplate = {
  id: 'default-chat-rules',
  content: `[RULES]
- Continue the dialogue by responding to the user's latest message.
- STRICTLY: Your response must be strictly in the same language that the user is communicating in "[HISTORY MESSAGE]".`,
  metadata: {
    description: 'Rules for chat mode',
    mode: 'chat',
    requiredPlaceholders: [],
    optionalPlaceholders: ['historyMessages'],
    version: '1.0.0',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Дефолтный шаблон промпта для простого перевода.
 */
export const DEFAULT_SIMPLE_TRANSLATION_PROMPT: PromptTemplate = {
  id: 'default-simple-translation',
  content: `Translate from {sourceLanguage} to {targetLanguage} the text after the colon, and return only the translated text:{text}`,
  metadata: {
    description: 'Prompt for simple text translation',
    mode: 'simpleTranslation',
    requiredPlaceholders: ['sourceLanguage', 'targetLanguage', 'text'],
    optionalPlaceholders: [],
    version: '1.0.0',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Дефолтный шаблон промпта для инструкций.
 * Извлечен из handleInstruction в feature-provider.ts.
 */
export const DEFAULT_INSTRUCTION_PROMPT: PromptTemplate = {
  id: 'default-instruction',
  content: `{instruction}: {text}`,
  metadata: {
    description: 'Prompt for executing instructions',
    mode: 'instruction',
    requiredPlaceholders: ['instruction', 'text'],
    optionalPlaceholders: [],
    version: '1.0.0',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Все дефолтные шаблоны промптов.
 * Используется для инициализации и сброса к дефолтным значениям.
 */
export const DEFAULT_PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  contextualTranslation: DEFAULT_CONTEXTUAL_TRANSLATION_PROMPT,
  chatSystem: DEFAULT_CHAT_SYSTEM_PROMPT,
  chatRules: DEFAULT_CHAT_RULES_PROMPT,
  simpleTranslation: DEFAULT_SIMPLE_TRANSLATION_PROMPT,
  instruction: DEFAULT_INSTRUCTION_PROMPT,
};

/**
 * Версия схемы хранения промптов.
 * Используется для миграции при обновлении структуры.
 */
export const PROMPT_STORAGE_VERSION = '1.0.0';

/**
 * Ключ для хранения промптов в localStorage.
 */
export const PROMPT_STORAGE_KEY = 'prompts';
