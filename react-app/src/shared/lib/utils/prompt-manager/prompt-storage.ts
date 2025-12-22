/**
 * @module PromptStorage
 * Утилиты для хранения промптов в localStorage.
 * Обеспечивает загрузку, сохранение, миграцию и сброс промптов.
 */

import { getStorageWrite, setStorageWrite } from '../control-local-storage';
import {
  PROMPT_STORAGE_KEY,
  PROMPT_STORAGE_VERSION,
  DEFAULT_PROMPT_TEMPLATES,
} from './constants/prompt-manager';
import type {
  PromptStorage,
  PromptTemplate,
  PromptMode,
  PromptResult,
} from './types/prompt-manager';

/**
 * Загружает промпты из localStorage.
 * Возвращает дефолтные значения, если хранилище пусто или произошла ошибка.
 *
 * @returns Результат загрузки промптов.
 */
export function loadPrompts(): PromptResult<PromptStorage> {
  try {
    const stored = getStorageWrite(PROMPT_STORAGE_KEY);

    // getStorageWrite возвращает '' если данных нет или произошла ошибка
    if (!stored || stored === '' || typeof stored !== 'object') {
      // Если хранилище пусто, возвращает дефолтные значения
      return {
        success: true,
        data: {
          version: PROMPT_STORAGE_VERSION,
          templates: {
            contextualTranslation:
              DEFAULT_PROMPT_TEMPLATES.contextualTranslation,
            chat: DEFAULT_PROMPT_TEMPLATES.chatSystem,
            simpleTranslation: DEFAULT_PROMPT_TEMPLATES.simpleTranslation,
            instruction: DEFAULT_PROMPT_TEMPLATES.instruction,
          } as Record<PromptMode, PromptTemplate>,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    const parsed = stored as PromptStorage;

    // Проверка версии и миграция при необходимости
    if (parsed.version !== PROMPT_STORAGE_VERSION) {
      const migrated = migratePrompts(parsed);
      return { success: true, data: migrated };
    }

    return { success: true, data: parsed };
  } catch (error) {
    // Fallback на дефолтные значения при ошибке
    return {
      success: true,
      data: {
        version: PROMPT_STORAGE_VERSION,
        templates: {
          contextualTranslation: DEFAULT_PROMPT_TEMPLATES.contextualTranslation,
          chat: DEFAULT_PROMPT_TEMPLATES.chatSystem,
          simpleTranslation: DEFAULT_PROMPT_TEMPLATES.simpleTranslation,
          instruction: DEFAULT_PROMPT_TEMPLATES.instruction,
        } as Record<PromptMode, PromptTemplate>,
        updatedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Сохраняет промпты в localStorage.
 *
 * @param storage - Данные для сохранения.
 * @returns Результат сохранения.
 */
export function savePrompts(storage: PromptStorage): PromptResult<void> {
  try {
    const dataToSave: PromptStorage = {
      ...storage,
      updatedAt: new Date().toISOString(),
    };

    setStorageWrite(PROMPT_STORAGE_KEY, dataToSave);

    return { success: true, data: undefined };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: `Failed to save prompts: ${errorMessage}`,
    };
  }
}

/**
 * Сбрасывает промпты к дефолтным значениям.
 *
 * @returns Результат сброса.
 */
export function resetToDefaults(): PromptResult<PromptStorage> {
  try {
    const defaultStorage: PromptStorage = {
      version: PROMPT_STORAGE_VERSION,
      templates: {
        contextualTranslation: DEFAULT_PROMPT_TEMPLATES.contextualTranslation,
        chat: DEFAULT_PROMPT_TEMPLATES.chatSystem,
        simpleTranslation: DEFAULT_PROMPT_TEMPLATES.simpleTranslation,
        instruction: DEFAULT_PROMPT_TEMPLATES.instruction,
      } as Record<PromptMode, PromptTemplate>,
      updatedAt: new Date().toISOString(),
    };

    const saveResult = savePrompts(defaultStorage);

    if (!saveResult.success) {
      return saveResult;
    }

    return { success: true, data: defaultStorage };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: `Failed to reset prompts: ${errorMessage}`,
    };
  }
}

/**
 * Мигрирует промпты при обновлении версии схемы.
 * Обеспечивает обратную совместимость при изменении структуры.
 *
 * @param oldStorage - Старые данные для миграции.
 * @returns Мигрированные данные.
 */
export function migratePrompts(oldStorage: PromptStorage): PromptStorage {
  // На данный момент просто обновляет версию
  // TODO: В будущем добавить логику миграции для разных версий
  const migrated: PromptStorage = {
    version: PROMPT_STORAGE_VERSION,
    templates: {
      // Сохраняет существующие шаблоны или использует дефолтные
      contextualTranslation:
        oldStorage.templates?.contextualTranslation ||
        DEFAULT_PROMPT_TEMPLATES.contextualTranslation,
      chat: oldStorage.templates?.chat || DEFAULT_PROMPT_TEMPLATES.chatSystem,
      simpleTranslation:
        oldStorage.templates?.simpleTranslation ||
        DEFAULT_PROMPT_TEMPLATES.simpleTranslation,
      instruction:
        oldStorage.templates?.instruction ||
        DEFAULT_PROMPT_TEMPLATES.instruction,
    } as Record<PromptMode, PromptTemplate>,
    updatedAt: new Date().toISOString(),
  };

  // Сохраняет мигрированные данные
  savePrompts(migrated);

  return migrated;
}
