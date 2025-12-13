/**
 * @module DocumentProcessor
 * Сервис для обработки PDF документов с расширяемой архитектурой.
 * Поддерживает извлечение текста, разбиение на чанки и готов к мультимодальному расширению.
 */

import * as path from 'path';
import * as fs from 'fs';
import { errorHandler, executeWithErrorHandling } from '../utils/error-handler';
import type { OperationResult, OperationContext } from '../types/error-handler';
import type { DocumentChunk } from '../types/rag';
import type {
  DocumentProcessorConfig,
  DocumentProcessor,
  DocumentProcessorPlugin,
  ProcessingOptions,
  ProcessingProgress,
  PDFProcessingResult,
  PDFMetadata,
  PDFPageInfo,
} from '../types/document-processor';
import { PDFUtils } from '../utils/document-processor';
import { getFileExtension } from '../utils/file-utils';
import {
  PAGE_DIMENSIONS,
  TEXT_PAGE_SIZES,
  TEXT_ENCODINGS,
} from '../constants/document-processor';

/**
 * Устанавливает polyfills для DOM API, которые требуются pdf-parse в Node.js окружении.
 */
function setupDOMPolyfills() {
  const globalObj = globalThis as Record<string, unknown>;

  // Устанавливаем polyfills только если они еще не установлены
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

// Lazy require для pdf-parse, чтобы избежать загрузки в Node.js окружении
let pdfParseLib: any = null;
function getPdfParse() {
  if (!pdfParseLib) {
    // Устанавливаем polyfills перед загрузкой pdf-parse
    setupDOMPolyfills();

    try {
      pdfParseLib = require('pdf-parse');
      console.log('📄 pdf-parse module loaded, type:', typeof pdfParseLib);
    } catch (error) {
      console.error('Failed to load pdf-parse:', error);
      throw new Error('pdf-parse cannot be loaded');
    }
  }

  return pdfParseLib;
}

/**
 * Основной сервис для обработки PDF документов.
 * Реализует полный цикл обработки с поддержкой расширений.
 */
export class DocumentProcessorService {
  private config: DocumentProcessorConfig;
  private processors: Map<string, DocumentProcessor> = new Map();
  private plugins: Map<string, DocumentProcessorPlugin> = new Map();
  private isInitialized: boolean = false;

  constructor(config?: Partial<DocumentProcessorConfig>) {
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      chunkSize: 2560,
      chunkOverlap: 50,
      supportedEncodings: ['utf-8', 'windows-1251', 'iso-8859-1'],
      enableVerboseLogging: true,
      enableStreaming: true,
      maxPages: 1000,
      extractMetadata: true,
      extractCoordinates: true,
      ...config,
    };
  }

  /**
   * Инициализирует сервис обработки документов.
   * Регистрирует встроенные процессоры и плагины.
   */
  async initialize(): Promise<OperationResult<void>> {
    const context: OperationContext = {
      module: 'DocumentProcessorService',
      operation: 'initialize',
    };

    return executeWithErrorHandling(
      async () => {
        if (this.isInitialized) {
          return;
        }

        // Регистрирует встроенный PDF процессор
        const pdfProcessor = new PDFProcessor(this.config);
        this.processors.set('pdf', pdfProcessor);

        // Регистрирует встроенный текстовый процессор
        const textProcessor = new TextProcessor(this.config);
        this.processors.set('txt', textProcessor);
        this.processors.set('md', textProcessor);

        this.isInitialized = true;

        if (this.config.enableVerboseLogging) {
          errorHandler.logSuccess(context);
        }
      },
      { context }
    );
  }

  /**
   * Общий метод для обработки документов.
   * Устраняет дублирование между processPDF и processTextFile.
   *
   * @param filePath - Путь к файлу.
   * @param processorType - Тип процессора ('pdf', 'txt', 'md').
   * @param options - Опции обработки.
   * @returns Результат обработки документа (без обертки OperationResult).
   */
  private async processDocument(
    filePath: string,
    processorType: string,
    options: ProcessingOptions = {}
  ): Promise<PDFProcessingResult> {
    if (!this.isInitialized) {
      throw new Error('DocumentProcessorService is not initialized');
    }

    const processor = this.processors.get(processorType);
    if (!processor) {
      throw new Error(
        `The processor for type "${processorType}" was not found.`
      );
    }

    // Читает файл
    const fileBuffer = await this.readFile(filePath);

    // Валидирует документ в зависимости от типа
    let validationResult: OperationResult<boolean>;
    if (processorType === 'pdf') {
      validationResult = await this.validateDocument(fileBuffer, filePath);
    } else {
      validationResult = await this.validateTextDocument(fileBuffer, filePath);
    }

    if (!validationResult.success) {
      throw new Error(validationResult.error || 'Document validation error');
    }

    // Для текстовых файлов передает filePath через options
    const processingOptions =
      processorType === 'pdf'
        ? options
        : {
            ...options,
            metadata: {
              ...options.metadata,
              filePath,
            },
          };

    // Обрабатывает документ
    const result = await processor.process(fileBuffer, processingOptions);
    if (!result.success || !result.data) {
      throw new Error(
        result.error || `File processing error for the type "${processorType}"`
      );
    }

    return result.data;
  }

  /**
   * Обрабатывает PDF документ и извлекает текст с метаданными.
   * Основной метод для обработки PDF файлов.
   */
  async processPDF(
    filePath: string,
    options: ProcessingOptions = {}
  ): Promise<OperationResult<PDFProcessingResult>> {
    const context: OperationContext = {
      module: 'DocumentProcessorService',
      operation: 'processPDF',
      params: { filePath, options },
    };

    return executeWithErrorHandling(
      async () => {
        return await this.processDocument(filePath, 'pdf', options);
      },
      { context }
    );
  }

  /**
   * Обрабатывает текстовый файл (.txt, .md) и извлекает текст с метаданными.
   * Основной метод для обработки текстовых файлов.
   */
  async processTextFile(
    filePath: string,
    options: ProcessingOptions = {}
  ): Promise<OperationResult<PDFProcessingResult>> {
    const context: OperationContext = {
      module: 'DocumentProcessorService',
      operation: 'processTextFile',
      params: { filePath, options },
    };

    return executeWithErrorHandling(
      async () => {
        const fileExtension = getFileExtension(filePath) || 'txt';
        return await this.processDocument(filePath, fileExtension, options);
      },
      { context }
    );
  }

  /**
   * Разбивает текст на контекстно-значимые фрагменты.
   * Создает чанки с перекрытием для сохранения контекста.
   */
  async splitIntoChunks(
    pages: PDFPageInfo[],
    metadata: PDFMetadata,
    chatId: string,
    options: ProcessingOptions = {}
  ): Promise<OperationResult<DocumentChunk[]>> {
    const context: OperationContext = {
      module: 'DocumentProcessorService',
      operation: 'splitIntoChunks',
      params: {
        pagesCount: pages.length,
        chatId,
        options,
      },
    };

    return executeWithErrorHandling(
      async () => {
        const chunks: DocumentChunk[] = [];
        const chunkSize = options.chunkSize ?? this.config.chunkSize;
        const overlap = options.chunkOverlap ?? this.config.chunkOverlap;
        // Переопределение размеров через опции обеспечивает согласованность с настройками UI

        // Использует утилиты для создания чанков
        const textChunks = PDFUtils.createTextChunks(pages, {
          chunkSize,
          overlapSize: overlap,
        });

        let chunkIndex = 0;
        for (const chunkText of textChunks) {
          // Определяет номер страницы для чанка
          let pageNumber = 1;
          for (const page of pages) {
            if (
              chunkText.includes(
                page.text.substring(0, Math.min(50, page.text.length))
              )
            ) {
              pageNumber = page.pageNumber;
              break;
            }
          }

          const chunk = this.createDocumentChunk(
            chunkText,
            metadata,
            chatId,
            chunkIndex,
            pageNumber
          );
          chunks.push(chunk);
          chunkIndex++;

          // Обновляет прогресс
          if (options.onProgress) {
            const progress: ProcessingProgress = {
              stage: 'chunking',
              progress: Math.round((chunkIndex / textChunks.length) * 100),
              currentPage: pageNumber,
              totalPages: pages.length,
              message: `Created chunks: ${chunkIndex}/${textChunks.length}`,
            };
            options.onProgress(progress);
          }
        }

        if (this.config.enableVerboseLogging) {
          errorHandler.logSuccess(context, undefined);
        }

        return chunks;
      },
      { context }
    );
  }

  /**
   * Извлекает метаданные из PDF документа.
   * Получает информацию о документе без полной обработки.
   */
  async extractMetadata(
    _filePath: string
  ): Promise<OperationResult<PDFMetadata>> {
    const context: OperationContext = {
      module: 'DocumentProcessorService',
      operation: 'extractMetadata',
    };

    return executeWithErrorHandling(
      async () => {
        if (!this.isInitialized) {
          throw new Error('DocumentProcessorService is not initialized');
        }

        const processor = this.processors.get('pdf');
        if (!processor) {
          throw new Error('PDF processor not found');
        }

        const fileBuffer = await this.readFile(_filePath);
        const result = await processor.extractMetadata(fileBuffer);

        if (!result.success) {
          throw new Error(result.error || 'Metadata extraction error');
        }

        return (
          result.data || {
            pageCount: 0,
            fileSize: 0,
            title: 'Unknown Document',
          }
        );
      },
      { context }
    );
  }

  /**
   * Валидирует PDF документ перед обработкой.
   * Проверяет корректность файла и его размер.
   */
  async validateDocument(
    fileBuffer: Buffer,
    _filePath: string
  ): Promise<OperationResult<boolean>> {
    const context: OperationContext = {
      module: 'DocumentProcessorService',
      operation: 'validateDocument',
      params: { fileSize: fileBuffer.length },
    };

    return executeWithErrorHandling(
      async () => {
        // Проверяет размер файла
        if (fileBuffer.length > this.config.maxFileSize) {
          throw new Error(
            `File size (${this.formatFileSize(fileBuffer.length)}) exceeds maximum allowed (${this.formatFileSize(this.config.maxFileSize)})`
          );
        }

        // Проверяет, что файл не пустой
        if (fileBuffer.length === 0) {
          throw new Error('File is empty');
        }

        // Проверяет заголовок PDF
        const pdfHeader = fileBuffer.slice(0, 4).toString();
        if (pdfHeader !== '%PDF') {
          throw new Error('File is not a valid PDF document');
        }

        // Проверяет расширение файла
        if (!_filePath.toLowerCase().endsWith('.pdf')) {
          throw new Error('File must have .pdf extension');
        }

        return true;
      },
      { context }
    );
  }

  /**
   * Валидирует текстовый документ перед обработкой.
   * Проверяет корректность файла и его размер.
   */
  async validateTextDocument(
    fileBuffer: Buffer,
    filePath: string
  ): Promise<OperationResult<boolean>> {
    const context: OperationContext = {
      module: 'DocumentProcessorService',
      operation: 'validateTextDocument',
      params: { fileSize: fileBuffer.length },
    };

    return executeWithErrorHandling(
      async () => {
        // Проверяет размер файла
        if (fileBuffer.length > this.config.maxFileSize) {
          throw new Error(
            `File size (${this.formatFileSize(fileBuffer.length)}) exceeds maximum allowed (${this.formatFileSize(this.config.maxFileSize)})`
          );
        }

        // Проверяет, что файл не пустой
        if (fileBuffer.length === 0) {
          throw new Error('File is empty');
        }

        // Проверяет расширение файла
        const fileName = filePath.toLowerCase();
        if (!fileName.endsWith('.txt') && !fileName.endsWith('.md')) {
          throw new Error('File must have .txt or .md extension');
        }

        return true;
      },
      { context }
    );
  }

  /**
   * Создает процессор для указанного типа документа.
   * Фабричный метод для создания процессоров различных типов.
   */
  createProcessor(fileType: string): DocumentProcessor | null {
    const processor = this.processors.get(fileType.toLowerCase());
    return processor || null;
  }

  /**
   * Регистрирует новый процессор документов.
   * Добавляет процессор в систему для обработки новых типов файлов.
   */
  registerProcessor(processor: DocumentProcessor): void {
    const fileTypes = processor.supportedFileTypes;
    for (const fileType of fileTypes) {
      this.processors.set(fileType.toLowerCase(), processor);
    }
  }

  /**
   * Регистрирует плагин обработки документов.
   * Расширяет функциональность системы обработки.
   */
  async registerPlugin(
    plugin: DocumentProcessorPlugin
  ): Promise<OperationResult<void>> {
    const context: OperationContext = {
      module: 'DocumentProcessorService',
      operation: 'registerPlugin',
      params: { pluginName: plugin.name },
    };

    return executeWithErrorHandling(
      async () => {
        await plugin.initialize();
        this.plugins.set(plugin.name, plugin);

        if (this.config.enableVerboseLogging) {
          errorHandler.logSuccess(context);
        }
      },
      { context }
    );
  }

  /**
   * Получает список поддерживаемых типов файлов.
   * Возвращает все типы файлов, которые могут быть обработаны.
   */
  getSupportedFileTypes(): string[] {
    const fileTypes = new Set<string>();

    for (const processor of this.processors.values()) {
      for (const fileType of processor.supportedFileTypes) {
        fileTypes.add(fileType);
      }
    }

    return Array.from(fileTypes);
  }

  /**
   * Очищает ресурсы сервиса.
   * Освобождает память и закрывает соединения.
   */
  async cleanup(): Promise<OperationResult<void>> {
    const context: OperationContext = {
      module: 'DocumentProcessorService',
      operation: 'cleanup',
    };

    return executeWithErrorHandling(
      async () => {
        // Очищает плагины
        for (const plugin of this.plugins.values()) {
          await plugin.cleanup();
        }

        this.processors.clear();
        this.plugins.clear();
        this.isInitialized = false;

        if (this.config.enableVerboseLogging) {
          errorHandler.logSuccess(context);
        }
      },
      { context }
    );
  }

  /**
   * Получает текущую конфигурацию сервиса.
   */
  getConfig(): DocumentProcessorConfig {
    return { ...this.config };
  }

  /**
   * Обновляет конфигурацию сервиса.
   */
  updateConfig(newConfig: Partial<DocumentProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Приватные методы

  /**
   * Читает файл с диска.
   * Внутренний метод для чтения файлов с обработкой ошибок.
   */
  private async readFile(filePath: string): Promise<Buffer> {
    return await fs.promises.readFile(filePath);
  }

  /**
   * Создает объект DocumentChunk из текста и метаданных.
   * Формирует структурированный чанк для векторного хранилища.
   */
  private createDocumentChunk(
    content: string,
    metadata: PDFMetadata,
    chatId: string,
    chunkIndex: number,
    pageNumber: number
  ): DocumentChunk {
    return {
      id: this.generateChunkId(chatId, chunkIndex),
      content,
      metadata: {
        source: metadata.title || 'unknown',
        pageNumber,
        chunkIndex,
        chatId,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Генерирует уникальный идентификатор чанка.
   * Создает ID на основе чата и индекса чанка.
   */
  private generateChunkId(chatId: string, chunkIndex: number): string {
    return `${chatId}_chunk_${chunkIndex}_${Date.now()}`;
  }

  /**
   * Форматирует размер файла в читаемый вид.
   * Конвертирует байты в KB, MB, GB.
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

/**
 * Встроенный процессор для PDF документов.
 * Реализует базовую функциональность обработки PDF.
 */
class PDFProcessor implements DocumentProcessor<Buffer, PDFProcessingResult> {
  readonly processorId = 'pdf-processor';
  readonly supportedFileTypes = ['pdf'];
  readonly config: DocumentProcessorConfig;

  constructor(config: DocumentProcessorConfig) {
    this.config = config;
  }

  supportsFileType(fileType: string): boolean {
    return this.supportedFileTypes.includes(fileType.toLowerCase());
  }

  async process(
    input: Buffer,
    options: ProcessingOptions = {}
  ): Promise<OperationResult<PDFProcessingResult>> {
    const context: OperationContext = {
      module: 'PDFProcessor',
      operation: 'process',
    };

    return executeWithErrorHandling(
      async () => {
        const startTime = Date.now();

        // Кастомный рендерер для извлечения текста
        const customPageRenderer = async (pageData: unknown) => {
          const renderOptions = {
            normalizeWhitespace: true,
            disableCombineTextItems: false,
          };

          const page = pageData as {
            getTextContent: (options: unknown) => Promise<{ items: unknown[] }>;
          };

          return page.getTextContent(renderOptions).then(textContent => {
            let text = '';

            for (const item of textContent.items) {
              const textItem = item as { str?: string };
              if (textItem.str) {
                text += textItem.str + ' ';
              }
            }

            // Обрезаем последний пробел
            return text.trim();
          });
        };

        // Парсим PDF с помощью pdf-parse с кастомным рендерером
        const pdfParseLib = getPdfParse();

        const pdfData = await pdfParseLib(input, {
          max: 0, // Все страницы
          version: 'v1.10.100',
          pagerender: customPageRenderer,
        });

        console.log('✅ PDF parsed, pages:', pdfData.numpages);
        console.log(
          `📝 Extracted ${pdfData.pageData && Array.isArray(pdfData.pageData) ? pdfData.pageData.length : 0} pages with text`
        );

        // Извлекает метаданные
        const metadata: PDFMetadata = {
          title: pdfData.info?.Title || undefined,
          author: pdfData.info?.Author || undefined,
          creationDate: pdfData.info?.CreationDate || undefined,
          modificationDate: pdfData.info?.ModDate || undefined,
          pageCount: pdfData.numpages,
          fileSize: input.length,
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

        const numPages = pdfData.numpages || 1;

        // pdf-parse с pagerender возвращает массив pageData со строками
        if (
          pdfData.pageData &&
          Array.isArray(pdfData.pageData) &&
          pdfData.pageData.length > 0
        ) {
          // Каждая страница - это строка из pagerender
          for (let i = 0; i < pdfData.pageData.length; i++) {
            const pageText = String(pdfData.pageData[i] || '').trim();

            const words = pageText
              .split(/\s+/)
              .filter((word: string) => word.length > 0);

            const pageInfo: PDFPageInfo = {
              pageNumber: i + 1,
              text: pageText,
              dimensions: PAGE_DIMENSIONS.A4,
              textBlocks: [] as any[],
              characterCount: pageText.length,
              wordCount: words.length,
            };

            pages.push(pageInfo);
            totalCharacterCount += pageText.length;
            totalWordCount += words.length;

            if (options.onProgress) {
              const progress: ProcessingProgress = {
                stage: 'parsing',
                progress: Math.round(((i + 1) / pdfData.pageData.length) * 100),
                currentPage: i + 1,
                totalPages: pdfData.pageData.length,
                message: `Pages processed: ${i + 1}/${pdfData.pageData.length}`,
              };
              options.onProgress(progress);
            }
          }
        } else {
          // Fallback: разбиваем весь текст на страницы
          const fullText = pdfData.text || '';
          const textPerPage = Math.ceil(fullText.length / numPages);

          for (let i = 0; i < numPages; i++) {
            const startIndex = i * textPerPage;
            const endIndex = Math.min(
              startIndex + textPerPage,
              fullText.length
            );
            const pageText = fullText.substring(startIndex, endIndex);

            const words = pageText
              .split(/\s+/)
              .filter((word: string) => word.length > 0);

            const pageInfo: PDFPageInfo = {
              pageNumber: i + 1,
              text: pageText,
              dimensions: PAGE_DIMENSIONS.A4,
              textBlocks: [] as any[],
              characterCount: pageText.length,
              wordCount: words.length,
            };

            pages.push(pageInfo);
            totalCharacterCount += pageText.length;
            totalWordCount += words.length;

            if (options.onProgress) {
              const progress: ProcessingProgress = {
                stage: 'parsing',
                progress: Math.round(((i + 1) / numPages) * 100),
                currentPage: i + 1,
                totalPages: numPages,
                message: `Pages processed: ${i + 1}/${numPages}`,
              };
              options.onProgress(progress);
            }
          }
        }

        const processingTime = Date.now() - startTime;

        const result: PDFProcessingResult = {
          success: true,
          metadata,
          pages,
          totalCharacterCount,
          totalWordCount,
          processingTime,
        };

        return result;
      },
      { context }
    );
  }

  validate(input: Buffer): OperationResult<boolean> {
    try {
      if (input.length === 0) {
        throw new Error('PDF file is empty');
      }

      const pdfHeader = input.slice(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        throw new Error('File is not a valid PDF document');
      }

      return {
        success: true,
        data: true,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async extractMetadata(input: Buffer): Promise<OperationResult<PDFMetadata>> {
    const context: OperationContext = {
      module: 'PDFProcessor',
      operation: 'extractMetadata',
    };

    return executeWithErrorHandling(
      async () => {
        // Извлекает метаданные с помощью pdf-parse
        const pdfParseLib = getPdfParse();
        const pdfData = await pdfParseLib(input, {
          max: 0, // Только метаданные, не парсит страницы
          version: 'v1.10.100',
        });

        const metadata: PDFMetadata = {
          title: pdfData.info?.Title || undefined,
          author: pdfData.info?.Author || undefined,
          creationDate: pdfData.info?.CreationDate || undefined,
          modificationDate: pdfData.info?.ModDate || undefined,
          pageCount: pdfData.numpages,
          fileSize: input.length,
          pdfVersion: pdfData.info?.PDFFormatVersion || undefined,
          keywords: pdfData.info?.Keywords
            ? pdfData.info.Keywords.split(',')
            : undefined,
          subject: pdfData.info?.Subject || undefined,
          creator: pdfData.info?.Creator || undefined,
          producer: pdfData.info?.Producer || undefined,
        };

        return metadata;
      },
      { context }
    );
  }
}

/**
 * Встроенный процессор для текстовых файлов (.txt, .md).
 * Реализует базовую функциональность обработки текстовых файлов.
 */
class TextProcessor implements DocumentProcessor<Buffer, PDFProcessingResult> {
  readonly processorId = 'text-processor';
  readonly supportedFileTypes = ['txt', 'md'];
  readonly config: DocumentProcessorConfig;

  constructor(config: DocumentProcessorConfig) {
    this.config = config;
  }

  supportsFileType(fileType: string): boolean {
    return this.supportedFileTypes.includes(fileType.toLowerCase());
  }

  async process(
    input: Buffer,
    options: ProcessingOptions = {}
  ): Promise<OperationResult<PDFProcessingResult>> {
    const context: OperationContext = {
      module: 'TextProcessor',
      operation: 'process',
    };

    return executeWithErrorHandling(
      async () => {
        const startTime = Date.now();

        // Определяет кодировку и читает текст
        let text = '';
        let encodingUsed = 'utf-8';
        const supportedEncodings =
          this.config.supportedEncodings.length > 0
            ? this.config.supportedEncodings
            : TEXT_ENCODINGS;

        // Пытается прочитать файл в разных кодировках
        for (const encoding of supportedEncodings) {
          try {
            const decoded = input.toString(encoding as BufferEncoding);
            // Проверяет, что текст читается корректно (нет заменяющих символов)
            if (!decoded.includes('\uFFFD')) {
              text = decoded;
              encodingUsed = encoding;
              break;
            }
          } catch {
            // Продолжает попытки с следующей кодировкой
            continue;
          }
        }

        // Если не удалось прочитать, использует UTF-8 по умолчанию
        if (!text) {
          text = input.toString('utf-8');
          encodingUsed = 'utf-8';
        }

        if (this.config.enableVerboseLogging) {
          console.log(
            `📝 Text file decoded using encoding: ${encodingUsed}, length: ${text.length}`
          );
        }

        // Разбивает текст на "страницы" для совместимости с PDFProcessingResult
        const pageSize = TEXT_PAGE_SIZES.DEFAULT_TEXT_PAGE_SIZE;
        const pages: PDFPageInfo[] = [];
        let totalCharacterCount = 0;
        let totalWordCount = 0;

        // Разбивает текст на страницы
        for (let i = 0; i < text.length; i += pageSize) {
          const pageText = text.substring(
            i,
            Math.min(i + pageSize, text.length)
          );
          const words = pageText
            .split(/\s+/)
            .filter((word: string) => word.length > 0);

          const pageInfo: PDFPageInfo = {
            pageNumber: pages.length + 1,
            text: pageText,
            dimensions: PAGE_DIMENSIONS.A4,
            textBlocks: [],
            characterCount: pageText.length,
            wordCount: words.length,
          };

          pages.push(pageInfo);
          totalCharacterCount += pageText.length;
          totalWordCount += words.length;

          if (options.onProgress) {
            const progress: ProcessingProgress = {
              stage: 'parsing',
              progress: Math.round(
                ((pages.length * pageSize) / text.length) * 100
              ),
              currentPage: pages.length,
              totalPages: Math.ceil(text.length / pageSize),
              message: `Pages processed: ${pages.length}`,
            };
            options.onProgress(progress);
          }
        }

        // Извлекает метаданные
        const filePath =
          (options.metadata?.['filePath'] as string | undefined) || '';

        let stats: fs.Stats | null = null;
        if (filePath) {
          try {
            stats = fs.statSync(filePath);
          } catch (error) {
            // Логирует ошибку, но не прерывает обработку
            if (this.config.enableVerboseLogging) {
              console.warn(
                `⚠️ Failed to read file stats for ${filePath}:`,
                error instanceof Error ? error.message : String(error)
              );
            }
            stats = null;
          }
        }

        const metadata: PDFMetadata = {
          title: filePath ? path.basename(filePath) : 'unknown.txt',
          pageCount: pages.length,
          fileSize: input.length,
          creationDate: stats?.birthtime?.toISOString(),
          modificationDate: stats?.mtime?.toISOString(),
        };

        const processingTime = Date.now() - startTime;

        const result: PDFProcessingResult = {
          success: true,
          metadata,
          pages,
          totalCharacterCount,
          totalWordCount,
          processingTime,
        };

        return result;
      },
      { context }
    );
  }

  validate(input: Buffer): OperationResult<boolean> {
    try {
      if (input.length === 0) {
        throw new Error('The text file is empty');
      }

      // Проверяет, что файл содержит текстовые данные
      // Пытается прочитать как UTF-8
      try {
        const text = input.toString('utf-8');
        // Проверяет наличие заменяющих символов (признак неверной кодировки)
        if (text.includes('\uFFFD') && input.length > 100) {
          // Для больших файлов это может быть проблемой
          console.warn('There may be an issue with the file encoding');
        }
      } catch {
        throw new Error('The file cannot be read as text.');
      }

      return {
        success: true,
        data: true,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async extractMetadata(input: Buffer): Promise<OperationResult<PDFMetadata>> {
    const context: OperationContext = {
      module: 'TextProcessor',
      operation: 'extractMetadata',
    };

    return executeWithErrorHandling(
      async () => {
        const metadata: PDFMetadata = {
          pageCount: 1, // Будет уточнено при полной обработке
          fileSize: input.length,
        };

        return metadata;
      },
      { context }
    );
  }
}

/**
 * Фабричная функция для создания сервиса обработки документов.
 * Создает экземпляр сервиса с настройками по умолчанию.
 */
export function createDocumentProcessorService(
  config?: Partial<DocumentProcessorConfig>
): DocumentProcessorService {
  return new DocumentProcessorService(config);
}
