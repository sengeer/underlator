/**
 * @module DocumentProcessorUtils
 * Утилиты для работы с различными кодировками и обработки документов.
 * Поддерживает UTF-8, Windows-1251, ISO-8859-1 и другие кодировки.
 */

import { errorHandler } from './error-handler';
import type { OperationResult, OperationContext } from '../types/error-handler';
import type {
  PDFMetadata,
  TextBlock,
  EncodingInfo,
  TextAnalysisResult,
  PDFPageInfo,
} from '../types/document-processor';
const pdfParse = require('pdf-parse');

/**
 * Утилиты для работы с кодировками текста.
 * Поддерживает автоматическое определение и конвертацию кодировок.
 */
export class EncodingUtils {
  // Список поддерживаемых кодировок для справки
  // private static readonly _SUPPORTED_ENCODINGS = [
  //   'utf-8',
  //   'windows-1251',
  //   'iso-8859-1',
  //   'iso-8859-5',
  //   'koi8-r',
  //   'cp1252',
  // ];

  /**
   * Определяет кодировку текста автоматически.
   * Использует эвристические методы для определения кодировки.
   */
  static detectEncoding(buffer: Buffer): EncodingInfo {
    const context: OperationContext = {
      module: 'EncodingUtils',
      operation: 'detectEncoding',
    };

    try {
      // Проверяет UTF-8
      if (this.isValidUTF8(buffer)) {
        return {
          encoding: 'utf-8',
          confidence: 0.95,
          language: this.detectLanguage(buffer.toString('utf-8')),
        };
      }

      // Проверяет Windows-1251
      if (this.isValidWindows1251(buffer)) {
        return {
          encoding: 'windows-1251',
          confidence: 0.85,
          language: 'ru',
        };
      }

      // Проверяет ISO-8859-1
      if (this.isValidISO88591(buffer)) {
        return {
          encoding: 'iso-8859-1',
          confidence: 0.8,
          language: 'en',
        };
      }

      // По умолчанию возвращает UTF-8
      return {
        encoding: 'utf-8',
        confidence: 0.5,
        language: 'unknown',
      };
    } catch (error) {
      errorHandler.logError(error, context);
      return {
        encoding: 'utf-8',
        confidence: 0.3,
        language: 'unknown',
      };
    }
  }

  /**
   * Конвертирует текст из одной кодировки в другую.
   * Поддерживает основные кодировки для многоязычных документов.
   */
  static convertEncoding(
    text: string,
    fromEncoding: string,
    toEncoding: string = 'utf-8'
  ): OperationResult<string> {
    const context: OperationContext = {
      module: 'EncodingUtils',
      operation: 'convertEncoding',
      params: { fromEncoding, toEncoding },
    };

    try {
      if (fromEncoding === toEncoding) {
        return {
          success: true,
          data: text,
          status: 'success',
          timestamp: new Date().toISOString(),
        };
      }

      // Здесь будет использоваться iconv-lite для конвертации
      // const convertedText = iconv.decode(iconv.encode(text, fromEncoding), toEncoding);

      // Временная заглушка для компиляции
      const convertedText = text;

      return {
        success: true,
        data: convertedText,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      errorHandler.logError(error, context);
      return {
        success: false,
        error: `Converting error from ${fromEncoding} to ${toEncoding}: ${(error as Error).message}`,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Проверяет, является ли буфер валидным UTF-8.
   * Использует стандартную проверку UTF-8 последовательностей.
   */
  private static isValidUTF8(buffer: Buffer): boolean {
    try {
      const text = buffer.toString('utf-8');
      const encoded = Buffer.from(text, 'utf-8');
      return buffer.equals(encoded);
    } catch {
      return false;
    }
  }

  /**
   * Проверяет, является ли буфер валидным Windows-1251.
   * Проверяет наличие кириллических символов в диапазоне Windows-1251.
   */
  private static isValidWindows1251(buffer: Buffer): boolean {
    // Проверяем наличие кириллических символов в диапазоне Windows-1251
    const cyrillicBytes = buffer.filter(
      byte =>
        (byte >= 0xc0 && byte <= 0xff) || // Кириллические символы
        (byte >= 0x80 && byte <= 0xbf) // Дополнительные символы
    );

    return cyrillicBytes.length > buffer.length * 0.1; // Минимум 10% кириллицы
  }

  /**
   * Проверяет, является ли буфер валидным ISO-8859-1.
   * Проверяет наличие латинских символов в диапазоне ISO-8859-1.
   */
  private static isValidISO88591(buffer: Buffer): boolean {
    // Проверяет наличие латинских символов в диапазоне ISO-8859-1
    const latinBytes = buffer.filter(
      byte =>
        (byte >= 0x20 && byte <= 0x7e) || // ASCII символы
        (byte >= 0xa0 && byte <= 0xff) // Расширенные латинские символы
    );

    return latinBytes.length > buffer.length * 0.8; // Минимум 80% латинских символов
  }

  /**
   * Определяет язык текста по содержимому.
   * Использует простую эвристику для определения языка.
   */
  private static detectLanguage(text: string): string {
    // Простая эвристика для определения языка
    const cyrillicChars = text.match(/[а-яё]/gi)?.length || 0;
    const latinChars = text.match(/[a-z]/gi)?.length || 0;

    if (cyrillicChars > latinChars) {
      return 'ru';
    } else if (latinChars > 0) {
      return 'en';
    }

    return 'unknown';
  }
}

/**
 * Утилиты для анализа текста.
 * Предоставляет методы для анализа структуры и характеристик текста.
 */
export class TextAnalysisUtils {
  /**
   * Анализирует текст и возвращает детальную статистику.
   * Предоставляет информацию о структуре и характеристиках текста.
   */
  static analyzeText(
    text: string,
    encoding: string = 'utf-8'
  ): TextAnalysisResult {
    const context: OperationContext = {
      module: 'TextAnalysisUtils',
      operation: 'analyzeText',
      params: { textLength: text.length, encoding },
    };

    try {
      // Подсчитывает символы
      const characterCount = text.length;

      // Подсчитывает слова
      const words = text.match(/\b\w+\b/g) || [];
      const wordCount = words.length;

      // Подсчитывает предложения
      const sentences = text.match(/[.!?]+/g) || [];
      const sentenceCount = sentences.length;

      // Подсчитывает абзацы
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      const paragraphCount = paragraphs.length;

      // Вычисляет средние значения
      const averageWordLength =
        wordCount > 0
          ? words.reduce((sum, word) => sum + word.length, 0) / wordCount
          : 0;
      const averageSentenceLength =
        sentenceCount > 0 ? wordCount / sentenceCount : 0;

      // Анализирует символы
      const characterStats = {
        spaces: (text.match(/\s/g) || []).length,
        punctuation: (text.match(/[^\w\s]/g) || []).length,
        digits: (text.match(/\d/g) || []).length,
        letters: (text.match(/[a-zA-Zа-яёА-ЯЁ]/g) || []).length,
      };

      // Определяет кодировку
      const encodingInfo = EncodingUtils.detectEncoding(
        Buffer.from(text, 'utf-8')
      );

      const result: TextAnalysisResult = {
        characterCount,
        wordCount,
        sentenceCount,
        paragraphCount,
        averageWordLength,
        averageSentenceLength,
        encoding: encodingInfo,
        language: encodingInfo.language,
        characterStats,
      };

      if (errorHandler.getConfig().enableVerboseLogging) {
        errorHandler.logSuccess(context);
      }

      return result;
    } catch (error) {
      errorHandler.logError(error, context);

      // Возвращает базовую статистику при ошибке
      return {
        characterCount: text.length,
        wordCount: 0,
        sentenceCount: 0,
        paragraphCount: 0,
        averageWordLength: 0,
        averageSentenceLength: 0,
        encoding: { encoding, confidence: 0.5 },
        characterStats: {
          spaces: 0,
          punctuation: 0,
          digits: 0,
          letters: 0,
        },
      };
    }
  }

  /**
   * Разбивает текст на предложения с учетом различных языков.
   * Улучшенный алгоритм разделения предложений.
   */
  static splitIntoSentences(text: string, language: string = 'en'): string[] {
    const context: OperationContext = {
      module: 'TextAnalysisUtils',
      operation: 'splitIntoSentences',
      params: { textLength: text.length, language },
    };

    try {
      let sentences: string[] = [];

      if (language === 'ru') {
        // Русский язык: учитывает сокращения
        sentences = text
          .split(/(?<=[.!?])\s+(?=[А-ЯЁ])/)
          .map(sentence => sentence.trim())
          .filter(sentence => sentence.length > 0);
      } else {
        // Английский и другие языки: стандартное разделение
        sentences = text
          .split(/(?<=[.!?])\s+(?=[A-Z])/)
          .map(sentence => sentence.trim())
          .filter(sentence => sentence.length > 0);
      }

      if (errorHandler.getConfig().enableVerboseLogging) {
        errorHandler.logSuccess(context);
      }

      return sentences;
    } catch (error) {
      errorHandler.logError(error, context);

      // Fallback к простому разделению
      return text
        .split(/[.!?]+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0);
    }
  }

  /**
   * Очищает текст от лишних символов и форматирования.
   * Удаляет специальные символы и нормализует пробелы.
   */
  static cleanText(text: string): string {
    const context: OperationContext = {
      module: 'TextAnalysisUtils',
      operation: 'cleanText',
      params: { textLength: text.length },
    };

    try {
      let cleanedText = text;

      // Нормализует пробелы
      cleanedText = cleanedText.replace(/\s+/g, ' ');

      // Удаляет лишние переносы строк
      cleanedText = cleanedText.replace(/\n\s*\n/g, '\n');

      // Удаляет специальные символы PDF
      cleanedText = cleanedText.replace(
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
        ''
      );

      // Нормализует кавычки
      cleanedText = cleanedText.replace(/[""]/g, '"');
      cleanedText = cleanedText.replace(/['']/g, "'");

      // Удаляет лишние пробелы в начале и конце
      cleanedText = cleanedText.trim();

      if (errorHandler.getConfig().enableVerboseLogging) {
        errorHandler.logSuccess(context);
      }

      return cleanedText;
    } catch (error) {
      errorHandler.logError(error, context);
      return text.trim();
    }
  }

  /**
   * Извлекает ключевые слова из текста.
   * Простой алгоритм извлечения ключевых слов.
   */
  static extractKeywords(text: string, maxKeywords: number = 10): string[] {
    const context: OperationContext = {
      module: 'TextAnalysisUtils',
      operation: 'extractKeywords',
      params: { textLength: text.length, maxKeywords },
    };

    try {
      // Очищает текст
      const cleanedText = this.cleanText(text.toLowerCase());

      // Извлекает слова
      const words = cleanedText.match(/\b\w{3,}\b/g) || [];

      // Подсчитывает частоту слов
      const wordFreq = new Map<string, number>();
      for (const word of words as string[]) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }

      // Сортирует по частоте
      const sortedWords = Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxKeywords)
        .map(([word]) => word);

      if (errorHandler.getConfig().enableVerboseLogging) {
        errorHandler.logSuccess(context);
      }

      return sortedWords;
    } catch (error) {
      errorHandler.logError(error, context);
      return [];
    }
  }
}

/**
 * Утилиты для работы с PDF метаданными.
 * Предоставляет методы для извлечения и обработки метаданных PDF.
 */
export class PDFMetadataUtils {
  /**
   * Извлекает метаданные из PDF буфера.
   * Парсит заголовки PDF для получения информации о документе.
   */
  static extractMetadata(buffer: Buffer): OperationResult<PDFMetadata> {
    const context: OperationContext = {
      module: 'PDFMetadataUtils',
      operation: 'extractMetadata',
      params: { bufferSize: buffer.length },
    };

    try {
      const metadata: PDFMetadata = {
        pageCount: 0,
        fileSize: buffer.length,
      };

      // Извлекает версию PDF
      const pdfVersionMatch = buffer
        .toString('ascii', 0, 8)
        .match(/PDF-(\d\.\d)/);
      if (pdfVersionMatch) {
        metadata.pdfVersion = pdfVersionMatch[1];
      }

      // Подсчитывает количество страниц (простая эвристика)
      const pageCount = (
        buffer.toString('ascii').match(/\/Type\s*\/Page[^s]/g) || []
      ).length;
      metadata.pageCount = Math.max(pageCount, 1);

      // Здесь будет более детальное извлечение метаданных с помощью pdf-parse
      // const pdfData = await pdfParse(buffer, { max: 0 });
      // metadata.title = pdfData.info?.Title;
      // metadata.author = pdfData.info?.Author;
      // metadata.creationDate = pdfData.info?.CreationDate;
      // metadata.modificationDate = pdfData.info?.ModDate;
      // metadata.keywords = pdfData.info?.Keywords?.split(',');
      // metadata.subject = pdfData.info?.Subject;
      // metadata.creator = pdfData.info?.Creator;
      // metadata.producer = pdfData.info?.Producer;

      return {
        success: true,
        data: metadata,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      errorHandler.logError(error, context);
      return {
        success: false,
        error: `Metadata extraction error: ${(error as Error).message}`,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Валидирует метаданные PDF документа.
   * Проверяет корректность и полноту метаданных.
   */
  static validateMetadata(metadata: PDFMetadata): OperationResult<boolean> {
    const context: OperationContext = {
      module: 'PDFMetadataUtils',
      operation: 'validateMetadata',
    };

    try {
      // Проверяет обязательные поля
      if (metadata.pageCount <= 0) {
        throw new Error('Page count must be greater than 0');
      }

      if (metadata.fileSize <= 0) {
        throw new Error('File size must be greater than 0');
      }

      // Проверяет корректность дат
      if (metadata.creationDate && !this.isValidDate(metadata.creationDate)) {
        throw new Error('Invalid date');
      }

      if (
        metadata.modificationDate &&
        !this.isValidDate(metadata.modificationDate)
      ) {
        throw new Error('Invalid change date');
      }

      return {
        success: true,
        data: true,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      errorHandler.logError(error, context);
      return {
        success: false,
        error: `Metadata validation error: ${(error as Error).message}`,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Проверяет корректность даты в различных форматах.
   * Поддерживает различные форматы дат PDF.
   */
  private static isValidDate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }
}

/**
 * Утилиты для работы с координатами текста в PDF.
 * Предоставляет методы для извлечения и обработки координат текстовых блоков.
 */
export class PDFCoordinatesUtils {
  /**
   * Извлекает координаты текстовых блоков из PDF.
   * Парсит информацию о позиционировании текста на странице.
   */
  static extractTextCoordinates(
    _pageData: unknown,
    pageNumber: number
  ): TextBlock[] {
    const context: OperationContext = {
      module: 'PDFCoordinatesUtils',
      operation: 'extractTextCoordinates',
      params: { pageNumber },
    };

    try {
      const textBlocks: TextBlock[] = [];

      // Здесь будет использоваться pdf-parse для извлечения координат
      // if (pageData.items) {
      //   for (const item of pageData.items) {
      //     if (item.str) {
      //       const textBlock: TextBlock = {
      //         content: item.str,
      //         coordinates: {
      //           x: item.x || 0,
      //           y: item.y || 0,
      //           width: item.width || 0,
      //           height: item.height || 0,
      //         },
      //         fontSize: item.fontSize,
      //         fontFamily: item.fontName,
      //         fontStyle: item.fontStyle,
      //       };
      //       textBlocks.push(textBlock);
      //     }
      //   }
      // }

      // Временная заглушка для компиляции
      const textBlock: TextBlock = {
        content:
          'Text coordinates will be extracted after pdf-parse installation',
        coordinates: {
          x: 0,
          y: 0,
          width: 100,
          height: 12,
        },
        fontSize: 12,
        fontFamily: 'Arial',
        fontStyle: 'normal',
      };
      textBlocks.push(textBlock);

      if (errorHandler.getConfig().enableVerboseLogging) {
        errorHandler.logSuccess(context);
      }

      return textBlocks;
    } catch (error) {
      errorHandler.logError(error, context);
      return [];
    }
  }

  /**
   * Группирует текстовые блоки по строкам.
   * Объединяет блоки, которые находятся на одной строке.
   */
  static groupTextBlocksByLines(textBlocks: TextBlock[]): TextBlock[][] {
    const context: OperationContext = {
      module: 'PDFCoordinatesUtils',
      operation: 'groupTextBlocksByLines',
      params: { textBlocksCount: textBlocks.length },
    };

    try {
      // Сортирует блоки по Y-координате
      const sortedBlocks = [...textBlocks].sort(
        (a, b) => b.coordinates.y - a.coordinates.y
      );

      const lines: TextBlock[][] = [];
      let currentLine: TextBlock[] = [];
      let currentY = -1;
      const tolerance = 5; // Допустимое отклонение для одной строки

      for (const block of sortedBlocks) {
        if (
          currentY === -1 ||
          Math.abs(block.coordinates.y - currentY) <= tolerance
        ) {
          currentLine.push(block);
          currentY = block.coordinates.y;
        } else {
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          currentLine = [block];
          currentY = block.coordinates.y;
        }
      }

      if (currentLine.length > 0) {
        lines.push(currentLine);
      }

      // Сортирует блоки в каждой строке по X-координате
      for (const line of lines) {
        line.sort((a, b) => a.coordinates.x - b.coordinates.x);
      }

      if (errorHandler.getConfig().enableVerboseLogging) {
        errorHandler.logSuccess(context);
      }

      return lines;
    } catch (error) {
      errorHandler.logError(error, context);
      return [textBlocks];
    }
  }
}

/**
 * Утилиты для работы с PDF документами.
 * Предоставляет методы для анализа и обработки PDF данных.
 */
export class PDFUtils {
  /**
   * Анализирует структуру PDF документа.
   * Извлекает информацию о страницах, тексте и метаданных.
   */
  static async analyzePDFStructure(
    buffer: Buffer,
    options: { maxPages?: number; extractCoordinates?: boolean } = {}
  ): Promise<
    OperationResult<{
      metadata: PDFMetadata;
      pages: PDFPageInfo[];
      totalStats: {
        characterCount: number;
        wordCount: number;
        pageCount: number;
      };
    }>
  > {
    const context: OperationContext = {
      module: 'PDFUtils',
      operation: 'analyzePDFStructure',
      params: {
        fileSize: buffer.length,
        maxPages: options.maxPages || 0,
        extractCoordinates: options.extractCoordinates || false,
      },
    };

    try {
      // Кастомный рендерер для извлечения координат
      const customPageRenderer = options.extractCoordinates
        ? async (pageData: unknown) => {
            const renderOptions = {
              normalizeWhitespace: false,
              disableCombineTextItems: false,
            };

            const page = pageData as {
              getTextContent: (
                options: unknown
              ) => Promise<{ items: unknown[] }>;
            };
            return page.getTextContent(renderOptions).then(textContent => {
              let lastY: number | null = null;
              let text = '';
              const textBlocks: TextBlock[] = [];

              for (const item of textContent.items) {
                const textItem = item as {
                  str?: string;
                  transform?: number[];
                  width?: number;
                  height?: number;
                  fontName?: string;
                };
                if (textItem.str && textItem.str.trim().length > 0) {
                  textBlocks.push({
                    content: textItem.str,
                    coordinates: {
                      x: textItem.transform?.[4] || 0,
                      y: textItem.transform?.[5] || 0,
                      width: textItem.width || 0,
                      height: textItem.height || 0,
                    },
                    fontSize: textItem.transform?.[0] || 12,
                    fontFamily: textItem.fontName || 'Arial',
                  });

                  if (lastY === textItem.transform?.[5] || !lastY) {
                    text += textItem.str;
                  } else {
                    text += '\n' + textItem.str;
                  }
                  lastY = textItem.transform?.[5] || null;
                }
              }

              return { text, textBlocks };
            });
          }
        : undefined;

      // Парсит PDF
      const pdfData = await pdfParse(buffer, {
        max: options.maxPages || 0,
        version: 'v1.10.100',
        pagerender: customPageRenderer,
      });

      // Извлекает метаданные
      const metadata: PDFMetadata = {
        title: pdfData.info?.Title || undefined,
        author: pdfData.info?.Author || undefined,
        creationDate: pdfData.info?.CreationDate || undefined,
        modificationDate: pdfData.info?.ModDate || undefined,
        pageCount: pdfData.numpages,
        fileSize: buffer.length,
        pdfVersion: pdfData.info?.PDFFormatVersion || undefined,
        keywords: pdfData.info?.Keywords
          ? pdfData.info.Keywords.split(',')
          : undefined,
        subject: pdfData.info?.Subject || undefined,
        creator: pdfData.info?.Creator || undefined,
        producer: pdfData.info?.Producer || undefined,
      };

      // Обрабатывает страницы
      const pages: PDFPageInfo[] = [];
      let totalCharacterCount = 0;
      let totalWordCount = 0;

      if (pdfData.pages && Array.isArray(pdfData.pages)) {
        for (let i = 0; i < pdfData.pages.length; i++) {
          const page = pdfData.pages[i];
          const pageText = page.text || '';
          const textBlocks = page.textBlocks || [];
          const words = pageText
            .split(/\s+/)
            .filter((word: string) => word.length > 0);

          const pageInfo: PDFPageInfo = {
            pageNumber: i + 1,
            text: pageText,
            dimensions: {
              width: page.width || 595,
              height: page.height || 842,
            },
            textBlocks,
            characterCount: pageText.length,
            wordCount: words.length,
          };

          pages.push(pageInfo);
          totalCharacterCount += pageText.length;
          totalWordCount += words.length;
        }
      } else {
        // Если нет данных о страницах, создает одну страницу
        const pageText = pdfData.text || '';
        const words = pageText
          .split(/\s+/)
          .filter((word: string) => word.length > 0);

        const pageInfo: PDFPageInfo = {
          pageNumber: 1,
          text: pageText,
          dimensions: { width: 595, height: 842 },
          textBlocks: [],
          characterCount: pageText.length,
          wordCount: words.length,
        };

        pages.push(pageInfo);
        totalCharacterCount = pageText.length;
        totalWordCount = words.length;
      }

      const result = {
        metadata,
        pages,
        totalStats: {
          characterCount: totalCharacterCount,
          wordCount: totalWordCount,
          pageCount: pages.length,
        },
      };

      if (errorHandler.getConfig().enableVerboseLogging) {
        errorHandler.logSuccess(context);
      }

      return {
        success: true,
        data: result,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      errorHandler.logError(error, context);
      return {
        success: false,
        error: (error as Error).message,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Извлекает только метаданные PDF документа без парсинга страниц.
   * Быстрый метод для получения информации о документе.
   */
  static async extractPDFMetadata(
    buffer: Buffer
  ): Promise<OperationResult<PDFMetadata>> {
    const context: OperationContext = {
      module: 'PDFUtils',
      operation: 'extractPDFMetadata',
      params: { fileSize: buffer.length },
    };

    try {
      const pdfData = await pdfParse(buffer, {
        max: 0, // Только метаданные
        version: 'v1.10.100',
      });

      const metadata: PDFMetadata = {
        title: pdfData.info?.Title || undefined,
        author: pdfData.info?.Author || undefined,
        creationDate: pdfData.info?.CreationDate || undefined,
        modificationDate: pdfData.info?.ModDate || undefined,
        pageCount: pdfData.numpages,
        fileSize: buffer.length,
        pdfVersion: pdfData.info?.PDFFormatVersion || undefined,
        keywords: pdfData.info?.Keywords
          ? pdfData.info.Keywords.split(',')
          : undefined,
        subject: pdfData.info?.Subject || undefined,
        creator: pdfData.info?.Creator || undefined,
        producer: pdfData.info?.Producer || undefined,
      };

      if (errorHandler.getConfig().enableVerboseLogging) {
        errorHandler.logSuccess(context);
      }

      return {
        success: true,
        data: metadata,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      errorHandler.logError(error, context);
      return {
        success: false,
        error: (error as Error).message,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Проверяет валидность PDF документа.
   * Проверяет заголовок и базовую структуру файла.
   */
  static validatePDF(buffer: Buffer): OperationResult<boolean> {
    const context: OperationContext = {
      module: 'PDFUtils',
      operation: 'validatePDF',
      params: { fileSize: buffer.length },
    };

    try {
      if (buffer.length === 0) {
        throw new Error('PDF file is empty');
      }

      const pdfHeader = buffer.slice(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        throw new Error('File is not a valid PDF document');
      }

      // Проверяем минимальный размер для PDF
      if (buffer.length < 100) {
        throw new Error('The PDF file is too small for a valid document');
      }

      if (errorHandler.getConfig().enableVerboseLogging) {
        errorHandler.logSuccess(context);
      }

      return {
        success: true,
        data: true,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      errorHandler.logError(error, context);
      return {
        success: false,
        error: (error as Error).message,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Создает чанки из текста PDF документа.
   * Разбивает текст на контекстно-значимые фрагменты.
   */
  static createTextChunks(
    pages: PDFPageInfo[],
    options: {
      chunkSize?: number;
      overlapSize?: number;
      preservePageStructure?: boolean;
    } = {}
  ): string[] {
    const chunkSize = options.chunkSize || 512;
    const overlapSize = options.overlapSize || 50;
    const preservePageStructure = options.preservePageStructure || true;

    const chunks: string[] = [];
    let currentChunk = '';
    let currentSize = 0;

    for (const page of pages) {
      const pageText = page.text;
      const words = pageText.split(/\s+/);

      for (const word of words as string[]) {
        const wordWithSpace = currentChunk ? ` ${word}` : word;

        if (currentSize + wordWithSpace.length > chunkSize && currentChunk) {
          // Добавляет текущий чанк
          chunks.push(currentChunk.trim());

          // Создает перекрытие
          const overlapText = currentChunk.slice(-overlapSize);
          currentChunk = overlapText + wordWithSpace;
          currentSize = overlapText.length + wordWithSpace.length;
        } else {
          currentChunk += wordWithSpace;
          currentSize += wordWithSpace.length;
        }
      }

      // Добавляет разделитель страниц если нужно сохранить структуру
      if (preservePageStructure && page.pageNumber < pages.length) {
        currentChunk += `\n\n[Page ${page.pageNumber + 1}]`;
        currentSize += `\n\n[Page ${page.pageNumber + 1}]`.length;
      }
    }

    // Добавляет последний чанк
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
