/**
 * @module PromptManagerConstants
 * Константы и дефолтные шаблоны промптов для системы управления промптами.
 */

import type { PromptTemplate } from '../types/prompt-manager';

/**
 * Шаблон промпта для контекстного перевода.
 */
export const DEFAULT_CONTEXTUAL_TRANSLATION_PROMPT: PromptTemplate = {
  id: 'default-contextual-translation',
  content: `### Role
You are a professional translation engine. Your task is to translate content from {sourceLanguage} to {targetLanguage} while strictly preserving technical markers "{chunkDelimiter}".

### Rules
1. Translate ONLY the text. Every occurrence of "{chunkDelimiter}" must remain UNCHANGED.
2. DO NOT modify, add, or delete these markers.
3. Keep the original spacing around markers.
4. Output ONLY the translated text without any comments or quotes.

### Example
Input: Important{chunkDelimiter}safety{chunkDelimiter}information
Output: Важная{chunkDelimiter}информация{chunkDelimiter}по безопасности

### Input to Translate
{combinedText}

### Translated Text:
`,
  metadata: {
    description:
      'Optimized prompt for local LLMs to translate with delimiter preservation',
    mode: 'contextualTranslation',
    requiredPlaceholders: [
      'sourceLanguage',
      'targetLanguage',
      'chunkDelimiter',
      'combinedText',
    ],
    optionalPlaceholders: [],
    version: '1.0.1',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Шаблон промпта для чата.
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
 * Правила для чата.
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
 * Шаблон промпта для простого перевода.
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
 * Шаблон промпта для инструкций.
 * Извлечен из handleInstruction в feature-provider.ts.
 */
export const DEFAULT_INSTRUCTION_PROMPT: PromptTemplate = {
  id: 'default-instruction',
  content: `{instruction}\n{text}`,
  metadata: {
    description: 'Prompt for executing instructions',
    mode: 'instruction',
    requiredPlaceholders: ['instruction', 'text'],
    optionalPlaceholders: [],
    version: '1.0.1',
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
export const PROMPT_STORAGE_VERSION = '0.1.0';

/**
 * Ключ для хранения промптов в localStorage.
 */
export const PROMPT_STORAGE_KEY = 'prompts';
