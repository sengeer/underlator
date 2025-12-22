/**
 * @module SimpleTranslationHandler
 * Обработчик простого перевода.
 * Обеспечивает построение промпта через PromptManager и обработку streaming ответа.
 */

import type { ModelRequestContext } from '../../hooks/use-model/types/feature-provider';
import { promptManager } from '../prompt-manager';

/**
 * Обрабатывает простой перевод.
 * Строит промпт через PromptManager и обрабатывает streaming ответ.
 *
 * @param context - Контекст запроса к модели.
 * @returns Промпт для простого перевода.
 */
export function handleSimpleTranslation(context: ModelRequestContext): string {
  const text =
    typeof context.text === 'string' ? context.text : context.text.join(' ');

  // Получает промпт из PromptManager
  const promptResult = promptManager.getPrompt('simpleTranslation', {
    sourceLanguage: context.sourceLanguage,
    targetLanguage: context.targetLanguage,
    text,
  });

  if (!promptResult.success) {
    // Fallback на старый формат промпта
    return `Translate from ${context.sourceLanguage} to ${context.targetLanguage} the text after the colon, and return only the translated text:${text}`;
  }

  return promptResult.data;
}
