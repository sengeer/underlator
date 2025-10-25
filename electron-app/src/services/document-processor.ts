/**
 * @module DocumentProcessor
 * Сервис для обработки PDF документов с расширяемой архитектурой.
 * Поддерживает извлечение текста, разбиение на чанки и готов к мультимодальному расширению.
 */

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
  TextBlock,
} from '../types/document-processor';
const pdfParse = require('pdf-parse');
import { PDFUtils } from '../utils/document-processor';

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
      chunkSize: 512,
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

        this.isInitialized = true;

        if (this.config.enableVerboseLogging) {
          errorHandler.logSuccess(context);
        }
      },
      { context }
    );
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
        if (!this.isInitialized) {
          throw new Error('DocumentProcessorService не инициализирован');
        }

        const processor = this.processors.get('pdf');
        if (!processor) {
          throw new Error('PDF процессор не найден');
        }

        // Читает файл
        const fileBuffer = await this.readFile(filePath);

        // Валидирует документ
        const validationResult = await this.validateDocument(
          fileBuffer,
          filePath
        );
        if (!validationResult.success) {
          throw new Error(
            validationResult.error || 'Ошибка валидации документа'
          );
        }

        // Обрабатывает документ
        const result = await processor.process(fileBuffer, options);
        if (!result.success) {
          throw new Error(result.error || 'Ошибка обработки PDF');
        }

        return (
          result.data || {
            success: false,
            metadata: { pageCount: 0, fileSize: 0 },
            pages: [],
            totalCharacterCount: 0,
            totalWordCount: 0,
            processingTime: 0,
            error: 'Ошибка обработки PDF',
          }
        );
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
        const chunkSize = this.config.chunkSize;
        const overlap = this.config.chunkOverlap;

        // Использует утилиты для создания чанков
        const textChunks = PDFUtils.createTextChunks(pages, {
          chunkSize,
          overlapSize: overlap,
          preservePageStructure: true,
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
          throw new Error('DocumentProcessorService не инициализирован');
        }

        const processor = this.processors.get('pdf');
        if (!processor) {
          throw new Error('PDF процессор не найден');
        }

        const fileBuffer = await this.readFile(_filePath);
        const result = await processor.extractMetadata(fileBuffer);

        if (!result.success) {
          throw new Error(result.error || 'Ошибка извлечения метаданных');
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
            `Размер файла (${this.formatFileSize(fileBuffer.length)}) превышает максимально допустимый (${this.formatFileSize(this.config.maxFileSize)})`
          );
        }

        // Проверяет, что файл не пустой
        if (fileBuffer.length === 0) {
          throw new Error('Файл пустой');
        }

        // Проверяет заголовок PDF
        const pdfHeader = fileBuffer.slice(0, 4).toString();
        if (pdfHeader !== '%PDF') {
          throw new Error('Файл не является корректным PDF документом');
        }

        // Проверяет расширение файла
        if (!_filePath.toLowerCase().endsWith('.pdf')) {
          throw new Error('Файл должен иметь расширение .pdf');
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
    const fs = require('fs').promises;
    return await fs.readFile(filePath);
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

        // Кастомный рендерер для извлечения координат текста
        const customPageRenderer = async (pageData: unknown) => {
          const renderOptions = {
            normalizeWhitespace: false,
            disableCombineTextItems: false,
          };

          const page = pageData as {
            getTextContent: (options: unknown) => Promise<{ items: unknown[] }>;
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
                // Добавляет блок текста с координатами
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

                // Формирует текст страницы
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
        };

        // Парсим PDF с помощью pdf-parse с кастомным рендерером
        const pdfData = await pdfParse(input, {
          max: 0, // Все страницы
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

        // Если есть данные о страницах из кастомного рендерера
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

            // Обновляет прогресс
            if (options.onProgress) {
              const progress: ProcessingProgress = {
                stage: 'parsing',
                progress: Math.round(((i + 1) / pdfData.pages.length) * 100),
                currentPage: i + 1,
                totalPages: pdfData.pages.length,
                message: `Pages processed: ${i + 1}/${pdfData.pages.length}`,
              };
              options.onProgress(progress);
            }
          }
        } else {
          // Если нет данных о страницах, создает одну страницу с общим текстом
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
        throw new Error('PDF файл пустой');
      }

      const pdfHeader = input.slice(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        throw new Error('Файл не является корректным PDF документом');
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
        const pdfData = await pdfParse(input, {
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
 * Фабричная функция для создания сервиса обработки документов.
 * Создает экземпляр сервиса с настройками по умолчанию.
 */
export function createDocumentProcessorService(
  config?: Partial<DocumentProcessorConfig>
): DocumentProcessorService {
  return new DocumentProcessorService(config);
}
