/**
 * @module ContextualTranslationHandler
 * Обработчик контекстного перевода.
 * Обеспечивает подготовку данных, построение промпта и обработку ответа.
 */

import { CHUNK_DELIMITER } from '../../constants';
import type { ModelRequestContext } from '../../hooks/use-model/types/feature-provider';
import { combineChunks } from '../chunk-text-manager/chunk-text-manager';
import { promptManager } from '../prompt-manager';
import type { ContextualTranslationPreparationResult } from './types/feature-handlers';

/**
 * Подготавливает данные для контекстного перевода.
 * Объединяет текстовые фрагменты и строит промпт через PromptManager.
 *
 * @param context - Контекст запроса к модели.
 * @returns Результат подготовки данных.
 */
export async function prepareContextualData(
  context: ModelRequestContext
): Promise<ContextualTranslationPreparationResult> {
  try {
    const textArray = Array.isArray(context.text)
      ? context.text
      : [context.text];

    // Объединяет фрагменты
    const combineResult = combineChunks(textArray);

    if (!combineResult.success) {
      return {
        success: false,
        error: combineResult.error || 'Failed to combine chunks',
      };
    }

    // Получает промпт из PromptManager
    const promptResult = promptManager.getPrompt('contextualTranslation', {
      sourceLanguage: context.sourceLanguage,
      targetLanguage: context.targetLanguage,
      chunkDelimiter: CHUNK_DELIMITER,
      combinedText: combineResult.data,
    });

    if (!promptResult.success) {
      return {
        success: false,
        error: promptResult.error || 'Failed to get prompt from PromptManager',
      };
    }

    return {
      success: true,
      combinedText: combineResult.data,
      prompt: promptResult.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
