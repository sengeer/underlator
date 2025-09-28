/**
 * @module HtmlParser
 * Утилиты для парсинга HTML страниц Ollama Library.
 * Извлекает список моделей и их теги с официального сайта Ollama.
 */

import { fetchWithErrorHandling } from './error-handler';
import type { ParsedModel, ParseResult, QuantizedModel } from '../types';

/**
 * Класс для парсинга HTML страниц Ollama Library.
 * Предоставляет методы для извлечения моделей и их тегов.
 */
export class OllamaHtmlParser {
  private readonly baseUrl = 'https://ollama.com';
  private readonly libraryUrl = `${this.baseUrl}/library`;
  private readonly tagsUrl = `${this.baseUrl}/library`;

  // Кэш для тегов моделей
  private tagsCache = new Map<string, string[]>();
  private cacheTimeout = 5 * 60 * 1000; // 5 минут
  private cacheTimestamps = new Map<string, number>();

  /**
   * Получает список всех доступных моделей со всеми квантизациями.
   * @returns Promise со списком моделей включая все квантизации.
   */
  async getAvailableModels(): Promise<ParseResult> {
    try {
      const response = await fetchWithErrorHandling(this.libraryUrl, {
        method: 'GET',
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Underlator-Electron/1.0.0',
        },
      });

      const html = await response.text();
      const baseModels = this.parseModelsFromHtml(html);

      // Ограничивает количество моделей для парсинга тегов (первые 20 самых популярных)
      const modelsToProcess = baseModels
        .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
        .slice(0, 20);

      // Параллельно получает теги для всех моделей (сложность O(1))
      const tagPromises = modelsToProcess.map(async baseModel => {
        try {
          const tags = await this.getModelTags(baseModel.name);
          return { baseModel, tags, success: true };
        } catch (error) {
          console.error(
            `❌ Couldn't get tags for the model ${baseModel.name}:`,
            error
          );
          return { baseModel, tags: [], success: false };
        }
      });

      const tagResults = await Promise.all(tagPromises);

      // Создает квантизированные модели
      const quantizedModels: QuantizedModel[] = [];

      for (const { baseModel, tags, success } of tagResults) {
        if (success && tags.length > 0) {
          // Создает отдельную запись для каждой квантизации
          for (const tag of tags) {
            // Исправляет формат названия - убирает дублирование baseName
            const fullName = tag.includes(':')
              ? tag
              : `${baseModel.name}:${tag}`;

            quantizedModels.push({
              fullName,
              baseName: baseModel.name,
              tag,
              description: baseModel.description,
              size: this.estimateQuantizedSize(baseModel.size, tag),
              downloads: baseModel.downloads,
              lastUpdated: baseModel.lastUpdated,
              category: baseModel.category,
              tags: [...baseModel.tags, tag],
            });
          }
        } else {
          // Добавляет базовую модель без тегов
          quantizedModels.push({
            fullName: baseModel.name,
            baseName: baseModel.name,
            tag: 'latest',
            description: baseModel.description,
            size: baseModel.size,
            downloads: baseModel.downloads,
            lastUpdated: baseModel.lastUpdated,
            category: baseModel.category,
            tags: [...baseModel.tags, 'latest'],
          });
        }
      }

      // Добавляет остальные модели без тегов (для полноты каталога)
      const processedModelNames = new Set(modelsToProcess.map(m => m.name));
      const remainingModels = baseModels.filter(
        m => !processedModelNames.has(m.name)
      );

      for (const baseModel of remainingModels) {
        quantizedModels.push({
          fullName: baseModel.name,
          baseName: baseModel.name,
          tag: 'latest',
          description: baseModel.description,
          size: baseModel.size,
          downloads: baseModel.downloads,
          lastUpdated: baseModel.lastUpdated,
          category: baseModel.category,
          tags: [...baseModel.tags, 'latest'],
        });
      }

      return {
        success: true,
        models: baseModels,
        quantizedModels,
      };
    } catch (error) {
      console.error('❌ Model list parsing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '❌ Unknown error',
      };
    }
  }

  /**
   * Получает теги для конкретной модели с кэшированием.
   * Использует кэш для избежания повторных HTTP запросов.
   * @param modelName - Название модели.
   * @returns Promise со списком тегов.
   */
  async getModelTags(modelName: string): Promise<string[]> {
    // Проверяет кэш
    const cachedTags = this.getCachedTags(modelName);
    if (cachedTags) {
      return cachedTags;
    }

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
      const tags = this.parseTagsFromHtml(html, modelName);

      // Сохраняет в кэш
      this.setCachedTags(modelName, tags);

      return tags;
    } catch (error) {
      console.error(`❌ Couldn't get tags for the model ${modelName}:`, error);
      return [];
    }
  }

  /**
   * Получает теги из кэша если они еще актуальны.
   * @param modelName - Название модели.
   * @returns Кэшированные теги или null.
   */
  private getCachedTags(modelName: string): string[] | null {
    const timestamp = this.cacheTimestamps.get(modelName);
    if (!timestamp || Date.now() - timestamp > this.cacheTimeout) {
      return null;
    }

    return this.tagsCache.get(modelName) || null;
  }

  /**
   * Сохраняет теги в кэш.
   * @param modelName - Название модели.
   * @param tags - Список тегов.
   */
  private setCachedTags(modelName: string, tags: string[]): void {
    this.tagsCache.set(modelName, tags);
    this.cacheTimestamps.set(modelName, Date.now());
  }

  /**
   * Парсит HTML главной страницы библиотеки.
   * Извлекает названия моделей и базовую информацию.
   * @param html - HTML содержимое страницы.
   * @returns Список моделей.
   */
  private parseModelsFromHtml(html: string): ParsedModel[] {
    const models: ParsedModel[] = [];

    // Регулярное выражение для поиска ссылок на модели
    const modelLinkRegex = /href="\/library\/([^"]+)"/g;
    let match;

    while ((match = modelLinkRegex.exec(html)) !== null) {
      const modelName = match[1];

      // Проверяет, что modelName существует и не является служебной ссылкой
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

    // Убирает дубликаты
    const uniqueModels = models.filter(
      (model, index, self) =>
        index === self.findIndex(m => m.name === model.name)
    );

    return uniqueModels;
  }

  /**
   * Парсит HTML страницы тегов модели.
   * Оптимизированная версия для извлечения всех доступных тегов.
   * @param html - HTML содержимое страницы тегов.
   * @param modelName - Название модели.
   * @returns Список тегов.
   */
  private parseTagsFromHtml(html: string, modelName: string): string[] {
    const tags: string[] = [];

    // Ищет все теги модели в формате "model:tag"
    const tagRegex = new RegExp(
      `\\b${modelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:([^"\\s<>,\\]]+)`,
      'g'
    );

    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tag = match[1];

      // Очищает тег от HTML тегов и лишних символов
      const cleanTag = tag?.replace(/<[^>]*>/g, '').trim();

      // Проверяет что тег валидный (не пустой, не содержит служебные символы)
      if (
        cleanTag &&
        cleanTag.length > 0 &&
        cleanTag.length < 50 && // разумная длина тега
        !cleanTag.includes('http') && // не URL
        !cleanTag.includes('www') && // не URL
        !tags.includes(cleanTag)
      ) {
        tags.push(cleanTag);
      }
    }

    // Если не найдены теги в формате "model:tag", ищет альтернативные форматы
    if (tags.length === 0) {
      // Ищет теги в других форматах
      const alternativeRegex = /<[^>]*>([^<]*:\d+(?:\.\d+)?[^<]*)</g;
      let altMatch;
      while ((altMatch = alternativeRegex.exec(html)) !== null) {
        const tag = altMatch[1]?.trim();
        if (tag && !tags.includes(tag)) {
          tags.push(tag);
        }
      }
    }

    // Убирает дубликаты и сортирует
    return [...new Set(tags)].sort();
  }

  /**
   * Извлекает дополнительную информацию о модели из HTML.
   * Ищет описание, размер, количество скачиваний и другие метаданные.
   * @param html - HTML содержимое страницы.
   * @param modelName - Название модели.
   * @returns Дополнительная информация о модели.
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
    // Ищет блок с информацией о модели
    const modelBlockRegex = new RegExp(
      `href="/library/${modelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>([\\s\\S]*?)</a>`,
      'i'
    );

    const match = html.match(modelBlockRegex);
    if (!match || !match[1]) {
      return {};
    }

    const modelBlock = match[1];

    // Извлекает описание
    const descriptionMatch = modelBlock.match(/>([^<]+)</);
    const description = descriptionMatch?.[1]?.trim();

    // Извлекает размер (ищет паттерны типа "2.5B", "7B", "70B")
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

    // Извлекает количество загрузок
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

    // Определяет категорию по тегам
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
   * Оценивает размер квантизированной модели.
   * Рассчитывает приблизительный размер на основе уровня квантизации.
   * @param baseSize - Базовый размер модели.
   * @param tag - Тег квантизации.
   * @returns Оцененный размер квантизированной модели.
   */
  private estimateQuantizedSize(
    baseSize?: number,
    tag?: string
  ): number | undefined {
    if (!baseSize || !tag) {
      return baseSize;
    }

    // Извлекаем уровень квантизации из тега
    const quantMatch = tag.match(/q(\d+)_(\d+)/i);
    if (!quantMatch || !quantMatch[1]) {
      return baseSize;
    }

    const quantLevel = parseInt(quantMatch[1], 10);

    // Коэффициенты сжатия для разных уровней квантизации
    const compressionRatios: { [key: number]: number } = {
      1: 0.5, // Q1 - очень высокая компрессия
      2: 0.6, // Q2
      3: 0.7, // Q3
      4: 0.8, // Q4 - популярная квантизация
      5: 0.85, // Q5
      6: 0.9, // Q6
      7: 0.95, // Q7
      8: 1.0, // Q8 - минимальная компрессия
    };

    const compressionRatio = compressionRatios[quantLevel] || 0.8;
    return Math.round(baseSize * compressionRatio);
  }

  /**
   * Получает полную информацию о модели с тегами
   * Объединяет базовую информацию с тегами
   * @param modelName - Название модели
   * @returns Promise с полной информацией о модели
   */
  async getFullModelInfo(modelName: string): Promise<ParsedModel | null> {
    try {
      // Получает базовую информацию
      const modelsResult = await this.getAvailableModels();
      if (!modelsResult.success || !modelsResult.models) {
        return null;
      }

      const baseModel = modelsResult.models.find(m => m.name === modelName);
      if (!baseModel) {
        return null;
      }

      // Получает теги
      const tags = await this.getModelTags(modelName);

      return {
        ...baseModel,
        tags: [...baseModel.tags, ...tags],
      };
    } catch (error) {
      console.error(
        `❌ Error getting full information about the model: ${modelName}:`,
        error
      );
      return null;
    }
  }
}

/**
 * Создает экземпляр OllamaHtmlParser.
 * @returns Экземпляр парсера.
 */
export function createOllamaHtmlParser(): OllamaHtmlParser {
  return new OllamaHtmlParser();
}
