/**
 * @module PromptManagerIndex
 * Индексный файл для системы управления промптами.
 */

export { promptManager, PromptManager } from './prompt-manager';
export {
  loadPrompts,
  savePrompts,
  resetToDefaults,
  migratePrompts,
} from './prompt-storage';
export {
  DEFAULT_CONTEXTUAL_TRANSLATION_PROMPT,
  DEFAULT_CHAT_SYSTEM_PROMPT,
  DEFAULT_CHAT_RULES_PROMPT,
  DEFAULT_SIMPLE_TRANSLATION_PROMPT,
  DEFAULT_INSTRUCTION_PROMPT,
  DEFAULT_PROMPT_TEMPLATES,
  PROMPT_STORAGE_VERSION,
  PROMPT_STORAGE_KEY,
} from './constants/prompt-manager';
export type {
  PromptMode,
  PromptTemplate,
  PromptTemplateMetadata,
  PromptConfig,
  PromptValidationResult,
  PromptStorage,
  PlaceholderMap,
  PromptResult,
} from './types/prompt-manager';
