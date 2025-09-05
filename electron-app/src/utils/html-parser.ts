/**
 * @module HtmlParser
 * @description Утилиты для парсинга HTML страниц Ollama Library
 * Извлекает список моделей и их теги с официального сайта Ollama
 */

import { fetchWithErrorHandling } from './error-handler';
import type { ParsedModel, ParseResult } from '../types';

/**
 * @description Класс для парсинга HTML страниц Ollama Library
 * Предоставляет методы для извлечения моделей и их тегов
 */
export class OllamaHtmlParser {
  private readonly baseUrl = 'https://ollama.com';
  private readonly libraryUrl = `${this.baseUrl}/library`;
  private readonly tagsUrl = `${this.baseUrl}/library`;

  /**
   * @description Получает список всех доступных моделей
   * Парсит главную страницу библиотеки Ollama
   * @returns Promise со списком моделей
   */
  async getAvailableModels(): Promise<ParseResult> {
    try {
      console.log('Парсинг списка моделей с Ollama Library...');

      const response = await fetchWithErrorHandling(this.libraryUrl, {
        method: 'GET',
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Underlator-Electron/1.0.0',
        },
      });

      const html = await response.text();
      const models = this.parseModelsFromHtml(html);

      console.log(`Найдено ${models.length} моделей в библиотеке Ollama`);

      return {
        success: true,
        models,
      };
    } catch (error) {
      console.error('Ошибка парсинга списка моделей:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * @description Получает теги для конкретной модели
   * Парсит страницу тегов модели
   * @param modelName - Название модели
   * @returns Promise со списком тегов
   */
  async getModelTags(modelName: string): Promise<string[]> {
    try {
      const url = `${this.tagsUrl}/${modelName}/tags`;
      const response = await fetchWithErrorHandling(url, {
        method: 'GET',
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Underlator-Electron/1.0.0',
        },
      });

      const html = await response.text();
      return this.parseTagsFromHtml(html, modelName);
    } catch (error) {
      console.warn(`Не удалось получить теги для модели ${modelName}:`, error);
      return [];
    }
  }

  /**
   * @description Парсит HTML главной страницы библиотеки
   * Извлекает названия моделей и базовую информацию
   * @param html - HTML содержимое страницы
   * @returns Список моделей
   */
  private parseModelsFromHtml(html: string): ParsedModel[] {
    const models: ParsedModel[] = [];

    // Регулярное выражение для поиска ссылок на модели
    const modelLinkRegex = /href="\/library\/([^"]+)"/g;
    let match;

    while ((match = modelLinkRegex.exec(html)) !== null) {
      const modelName = match[1];

      // Проверяем, что modelName существует и не является служебной ссылкой
      if (!modelName || modelName.includes('/') || modelName === '') {
        continue;
      }

      // Извлекаем дополнительную информацию о модели
      const modelInfo = this.extractModelInfo(html, modelName);

      models.push({
        name: modelName,
        description: modelInfo.description,
        tags: ['available'], // Базовый тег
        size: modelInfo.size,
        downloads: modelInfo.downloads,
        lastUpdated: modelInfo.lastUpdated,
        category: modelInfo.category,
      });
    }

    // Убираем дубликаты
    const uniqueModels = models.filter(
      (model, index, self) =>
        index === self.findIndex(m => m.name === model.name)
    );

    return uniqueModels;
  }

  /**
   * @description Парсит HTML страницы тегов модели
   * Извлекает все доступные теги для модели
   * @param html - HTML содержимое страницы тегов
   * @param modelName - Название модели
   * @returns Список тегов
   */
  private parseTagsFromHtml(html: string, modelName: string): string[] {
    const tags: string[] = [];

    // Регулярное выражение для поиска тегов модели
    const tagRegex = new RegExp(
      `${modelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:[^"\\s<>]+`,
      'g'
    );
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      const tag = match[0];

      // Очищаем тег от HTML тегов
      const cleanTag = tag.replace(/<[^>]*>/g, '');

      if (cleanTag && !tags.includes(cleanTag)) {
        tags.push(cleanTag);
      }
    }

    return tags;
  }

  /**
   * @description Извлекает дополнительную информацию о модели из HTML
   * Ищет описание, размер, количество скачиваний и другие метаданные
   * @param html - HTML содержимое страницы
   * @param modelName - Название модели
   * @returns Дополнительная информация о модели
   */
  private extractModelInfo(
    html: string,
    modelName: string
  ): {
    description?: string;
    size?: number;
    downloads?: number;
    lastUpdated?: string;
    category?: string;
  } {
    // Ищем блок с информацией о модели
    const modelBlockRegex = new RegExp(
      `href="/library/${modelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>([\\s\\S]*?)</a>`,
      'i'
    );

    const match = html.match(modelBlockRegex);
    if (!match || !match[1]) {
      return {};
    }

    const modelBlock = match[1];

    // Извлекаем описание
    const descriptionMatch = modelBlock.match(/>([^<]+)</);
    const description = descriptionMatch?.[1]?.trim();

    // Извлекаем размер (ищем паттерны типа "2.5B", "7B", "70B")
    const sizeMatch = modelBlock.match(/(\d+(?:\.\d+)?)([BMK])/i);
    let size: number | undefined;
    if (sizeMatch && sizeMatch[1] && sizeMatch[2]) {
      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toUpperCase();
      switch (unit) {
        case 'B':
          size = value * 1000000000; // миллиарды
          break;
        case 'M':
          size = value * 1000000; // миллионы
          break;
        case 'K':
          size = value * 1000; // тысячи
          break;
      }
    }

    // Извлекаем количество скачиваний
    const downloadsMatch = modelBlock.match(/(\d+(?:\.\d+)?)([MK]?)\s*Pulls/i);
    let downloads: number | undefined;
    if (downloadsMatch && downloadsMatch[1]) {
      const value = parseFloat(downloadsMatch[1]);
      const unit = downloadsMatch[2];
      switch (unit) {
        case 'M':
          downloads = value * 1000000;
          break;
        case 'K':
          downloads = value * 1000;
          break;
        default:
          downloads = value;
          break;
      }
    }

    // Определяем категорию по тегам
    let category: string | undefined;
    if (modelBlock.includes('vision')) category = 'vision';
    else if (modelBlock.includes('embedding')) category = 'embedding';
    else if (modelBlock.includes('tools')) category = 'tools';
    else if (modelBlock.includes('thinking')) category = 'reasoning';
    else category = 'general';

    return {
      description,
      size,
      downloads,
      category,
    };
  }

  /**
   * @description Получает полную информацию о модели с тегами
   * Объединяет базовую информацию с тегами
   * @param modelName - Название модели
   * @returns Promise с полной информацией о модели
   */
  async getFullModelInfo(modelName: string): Promise<ParsedModel | null> {
    try {
      // Сначала получаем базовую информацию
      const modelsResult = await this.getAvailableModels();
      if (!modelsResult.success || !modelsResult.models) {
        return null;
      }

      const baseModel = modelsResult.models.find(m => m.name === modelName);
      if (!baseModel) {
        return null;
      }

      // Получаем теги
      const tags = await this.getModelTags(modelName);

      return {
        ...baseModel,
        tags: [...baseModel.tags, ...tags],
      };
    } catch (error) {
      console.error(
        `Ошибка получения полной информации о модели ${modelName}:`,
        error
      );
      return null;
    }
  }
}

/**
 * @description Создает экземпляр OllamaHtmlParser
 * @returns Экземпляр парсера
 */
export function createOllamaHtmlParser(): OllamaHtmlParser {
  return new OllamaHtmlParser();
}
