/**
 * @module PromptManager
 * Класс для управления промптами с поддержкой шаблонов, плейсхолдеров и хранения.
 * Обеспечивает централизованное управление промптами для всех режимов работы с LLM.
 */

import { loadPrompts, savePrompts, resetToDefaults } from './prompt-storage';
import type {
  PromptTemplate,
  PromptMode,
  PlaceholderMap,
  PromptValidationResult,
  PromptResult,
  PromptStorage,
} from './types/prompt-manager';

/**
 * Класс для управления промптами.
 * Обеспечивает получение, обновление, валидацию и сброс промптов.
 */
export class PromptManager {
  /** Кэш промптов в памяти для O(1) доступа */
  private cache: Map<string, string> = new Map();
  /** Загруженные шаблоны промптов */
  private storage: PromptStorage | null = null;

  /**
   * Конструктор класса PromptManager.
   * Загружает промпты из localStorage при инициализации.
   */
  constructor() {
    this.loadStorage();
  }

  /**
   * Загружает промпты из localStorage.
   * Вызывается при инициализации и при необходимости обновления кэша.
   */
  private loadStorage(): void {
    const result = loadPrompts();

    if (result.success) {
      this.storage = result.data;
      this.cache.clear(); // Очищает кэш при загрузке новых данных
    } else {
      console.error(`Failed to load prompts: ${result.error}`);
    }
  }

  /**
   * Получает промпт для указанного режима с подстановкой плейсхолдеров.
   * Использует кэширование для оптимизации производительности.
   *
   * @param mode - Режим использования промпта.
   * @param placeholders - Карта плейсхолдеров для подстановки.
   * @returns Промпт с подставленными плейсхолдерами или ошибка.
   *
   * @example
   * const manager = new PromptManager();
   * const prompt = manager.getPrompt('contextualTranslation', {
   *   sourceLanguage: 'en',
   *   targetLanguage: 'ru',
   *   chunkDelimiter: '🔴',
   *   combinedText: 'Hello world'
   * });
   */
  getPrompt(
    mode: PromptMode,
    placeholders: PlaceholderMap = {}
  ): PromptResult<string> {
    try {
      if (!this.storage) {
        this.loadStorage();
      }

      if (!this.storage) {
        return {
          success: false,
          error: 'Failed to load prompt storage',
        };
      }

      // Определяет, какой шаблон использовать для режима
      let template: PromptTemplate | undefined;

      template = this.storage.templates[mode];

      if (!template) {
        return {
          success: false,
          error: `Template not found for mode: ${mode}`,
        };
      }

      // Генерирует ключ кэша на основе режима и плейсхолдеров
      const cacheKey = this.generateCacheKey(mode, placeholders);

      // Проверяет кэш
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        return { success: true, data: cached };
      }

      // Подставляет плейсхолдеры
      let prompt = template.content;

      // Подставляет все плейсхолдеры из карты
      for (const [key, value] of Object.entries(placeholders)) {
        const placeholder = `{${key}}`;
        prompt = prompt.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          value
        );
      }

      // Сохраняет в кэш
      this.cache.set(cacheKey, prompt);

      return { success: true, data: prompt };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      console.error(`Failed to get prompt: ${errorMessage}`);

      return {
        success: false,
        error: `Failed to get prompt: ${errorMessage}`,
      };
    }
  }

  /**
   * Генерирует ключ кэша на основе режима и плейсхолдеров.
   *
   * @param mode - Режим использования промпта.
   * @param placeholders - Карта плейсхолдеров.
   * @returns Ключ кэша.
   */
  private generateCacheKey(
    mode: PromptMode,
    placeholders: PlaceholderMap
  ): string {
    const sortedPlaceholders = Object.entries(placeholders)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return `${mode}:${sortedPlaceholders}`;
  }

  /**
   * Обновляет промпт для указанного режима.
   * Валидирует промпт перед сохранением.
   *
   * @param mode - Режим использования промпта.
   * @param template - Новый шаблон промпта.
   * @returns Результат обновления.
   */
  updatePrompt(mode: PromptMode, template: PromptTemplate): PromptResult<void> {
    try {
      // Валидация перед обновлением
      const validation = this.validatePrompt(template);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Prompt validation failed',
        };
      }

      if (!this.storage) {
        this.loadStorage();
      }

      if (!this.storage) {
        return {
          success: false,
          error: 'Failed to load prompt storage',
        };
      }

      // Обновляет шаблон
      const updatedTemplate: PromptTemplate = {
        ...template,
        updatedAt: new Date().toISOString(),
      };

      // Обновляет хранилище
      this.storage.templates[mode] = updatedTemplate;

      // Сохраняет в localStorage
      const saveResult = savePrompts(this.storage);

      if (!saveResult.success) {
        return saveResult;
      }

      // Очищает кэш для этого режима
      this.clearCacheForMode(mode);

      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: `Failed to update prompt: ${errorMessage}`,
      };
    }
  }

  /**
   * Валидирует промпт перед сохранением.
   * Проверяет наличие обязательных плейсхолдеров и корректность структуры.
   *
   * @param template - Шаблон промпта для валидации.
   * @returns Результат валидации.
   */
  validatePrompt(template: PromptTemplate): PromptValidationResult {
    // Проверка базовой структуры
    if (!template.id || typeof template.id !== 'string') {
      return {
        valid: false,
        error: 'Template must have a valid id',
      };
    }

    if (!template.content || typeof template.content !== 'string') {
      return {
        valid: false,
        error: 'Template must have valid content',
      };
    }

    if (!template.metadata || typeof template.metadata !== 'object') {
      return {
        valid: false,
        error: 'Template must have valid metadata',
      };
    }

    // Проверка обязательных плейсхолдеров
    const requiredPlaceholders = template.metadata.requiredPlaceholders || [];
    const missingPlaceholders: string[] = [];

    for (const placeholder of requiredPlaceholders) {
      const placeholderPattern = `{${placeholder}}`;

      if (!template.content.includes(placeholderPattern)) {
        missingPlaceholders.push(placeholder);
      }
    }

    if (missingPlaceholders.length > 0) {
      return {
        valid: false,
        error: `Missing required placeholders: ${missingPlaceholders.join(', ')}`,
        missingPlaceholders,
      };
    }

    // Проверка на неиспользуемые плейсхолдеры
    const allPlaceholders = [
      ...requiredPlaceholders,
      ...(template.metadata.optionalPlaceholders || []),
    ];
    const unusedPlaceholders: string[] = [];

    // Находит все плейсхолдеры в контенте
    const placeholderRegex = /\{(\w+)\}/g;
    const foundPlaceholders = new Set<string>();
    let match;

    while ((match = placeholderRegex.exec(template.content)) !== null) {
      foundPlaceholders.add(match[1]);
    }

    // Проверяет, есть ли плейсхолдеры, которые не объявлены в метаданных
    for (const found of foundPlaceholders) {
      if (!allPlaceholders.includes(found)) {
        unusedPlaceholders.push(found);
      }
    }

    return {
      valid: true,
      unusedPlaceholders:
        unusedPlaceholders.length > 0 ? unusedPlaceholders : undefined,
    };
  }

  /**
   * Сбрасывает промпты к дефолтным значениям.
   *
   * @returns Результат сброса.
   */
  resetToDefaults(): PromptResult<PromptStorage> {
    try {
      const result = resetToDefaults();

      if (result.success) {
        this.storage = result.data;
        this.cache.clear();
      }

      return result;
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
   * Очищает кэш для указанного режима.
   *
   * @param mode - Режим использования промпта.
   */
  private clearCacheForMode(mode: PromptMode): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${mode}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Получает шаблон промпта для указанного режима.
   *
   * @param mode - Режим использования промпта.
   * @returns Шаблон промпта или null.
   */
  getTemplate(mode: PromptMode): PromptTemplate | null {
    if (!this.storage) {
      this.loadStorage();
    }

    if (!this.storage) {
      return null;
    }

    return this.storage.templates[mode] || null;
  }

  /**
   * Получает все шаблоны промптов.
   *
   * @returns Все шаблоны промптов.
   */
  getAllTemplates(): Record<PromptMode, PromptTemplate> | null {
    if (!this.storage) {
      this.loadStorage();
    }

    return this.storage?.templates || null;
  }
}
/**
 * Глобальный экземпляр PromptManager.
 * Используется для единообразного доступа к промптам во всем приложении.
 */
export const promptManager = new PromptManager();

export default promptManager;
