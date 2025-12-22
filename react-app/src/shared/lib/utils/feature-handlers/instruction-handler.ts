/**
 * @module InstructionHandler
 * Обработчик инструкций.
 * Обеспечивает построение промпта через PromptManager и обработку streaming ответа.
 */

import type { ModelRequestContext } from '../../hooks/use-model/types/feature-provider';
import { promptManager } from '../prompt-manager';

/**
 * Обрабатывает инструкции.
 * Строит промпт через PromptManager и обрабатывает streaming ответ.
 *
 * @param context - Контекст запроса к модели.
 * @returns Промпт для инструкций.
 */
export function handleInstruction(context: ModelRequestContext): string {
  const text =
    typeof context.text === 'string' ? context.text : context.text.join(' ');
  const instruction = context.params.instruction || '';

  // Получает промпт из PromptManager
  const promptResult = promptManager.getPrompt('instruction', {
    instruction,
    text,
  });

  if (!promptResult.success) {
    // Fallback на старый формат промпта
    return `${instruction}: ${text}`;
  }

  return promptResult.data;
}
