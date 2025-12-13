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
  PDFPageInfo,
} from '../types/document-processor';

// Lazy loading для pdf-parse с инициализацией polyfills
let pdfParseModule: any = null;
function getPdfParse() {
  if (!pdfParseModule) {
    // Устанавливает polyfills перед загрузкой pdf-parse
    setupDOMPolyfills();

    try {
      pdfParseModule = require('pdf-parse');

      console.log('📄 pdf-parse module loaded, type:', typeof pdfParseModule);
      console.log(
        '📄 pdf-parse module keys:',
        Object.keys(pdfParseModule || {})
      );

      // pdf-parse может быть модулем или функцией
      // Проверяет, является ли модуль функцией напрямую
      if (typeof pdfParseModule === 'function') {
        console.log('✅ pdf-parse is a function');
        return pdfParseModule;
      }

      // Если модуль имеет default export
      if (
        pdfParseModule.default &&
        typeof pdfParseModule.default === 'function'
      ) {
        console.log('✅ pdf-parse has default function');
        return pdfParseModule.default;
      }

      console.log(
        '⚠️ pdf-parse module is not a function, module type:',
        typeof pdfParseModule
      );

      // Возвращает модуль и попробует вызвать напрямую
      return pdfParseModule;
    } catch (error) {
      console.error('Failed to load pdf-parse:', error);
      throw new Error('pdf-parse cannot be loaded');
    }
  }

  return pdfParseModule;
}

/**
 * Устанавливает polyfills для DOM API, которые требуются pdf-parse в Node.js окружении.
 */
function setupDOMPolyfills() {
  const globalObj = globalThis as Record<string, unknown>;

  // Устанавливает polyfills только если они еще не установлены
  if (typeof globalObj['DOMMatrix'] === 'undefined') {
    globalObj['DOMMatrix'] = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      m11 = 1;
      m12 = 0;
      m13 = 0;
      m14 = 0;
      m21 = 0;
      m22 = 1;
      m23 = 0;
      m24 = 0;
      m31 = 0;
      m32 = 0;
      m33 = 1;
      m34 = 0;
      m41 = 0;
      m42 = 0;
      m43 = 0;
      m44 = 1;

      constructor(_init?: string | number[]) {
        // Инициализация матрицы
      }
    };
  }

  if (typeof globalObj['ImageData'] === 'undefined') {
    globalObj['ImageData'] = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;

      constructor(widthOrData: number | Uint8ClampedArray, height?: number) {
        if (typeof widthOrData === 'number') {
          this.width = widthOrData;
          this.height = height || widthOrData;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        } else {
          this.data = widthOrData;
          this.width = height || 0;
          this.height = 0;
        }
      }
    };
  }

  if (typeof globalObj['Path2D'] === 'undefined') {
    globalObj['Path2D'] = class Path2D {
      constructor(_path?: unknown) {
        // Инициализация пути
      }
    };
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
      const pdfParseLib = getPdfParse() as any;

      // Попробует вызвать модуль как функцию
      // pdf-parse может быть export'ом как объект в CommonJS, но всё равно быть callable
      console.log('📄 Calling pdf-parse, module type:', typeof pdfParseLib);

      let pdfData;
      pdfData = await pdfParseLib(buffer, {
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
      const pdfParseLib = getPdfParse() as any;
      let pdfData;

      // Попробует вызвать модуль как функцию
      pdfData = await pdfParseLib(buffer, {
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

      // Проверяет минимальный размер для PDF
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
    } = {}
  ): string[] {
    const chunkSize = options.chunkSize || 512;
    const overlapSize = options.overlapSize || 50;

    const chunks: string[] = [];
    let currentChunk = '';
    let currentSize = 0;

    for (const page of pages) {
      // Использует текст страницы как есть (без очистки, чтобы не потерять содержимое)
      const pageText = page.text || '';
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

      // Не добавляет никаких маркеров страниц в контент чанков,
      // чтобы промпт содержал только текст документа
    }

    // Добавляет последний чанк
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
