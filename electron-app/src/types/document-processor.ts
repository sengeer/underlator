/**
 * @module DocumentProcessorTypes
 * Дополнительные типы для сервиса обработки документов.
 * Расширяет базовые типы RAG системы для обработки документов.
 */

import type { DocumentChunk } from './rag';
import type { OperationResult } from './error-handler';

/**
 * Интерфейс для конфигурации обработки документов.
 * Расширенная конфигурация с дополнительными параметрами.
 */
export interface DocumentProcessorConfig {
  /** Максимальный размер файла в байтах */
  maxFileSize: number;
  /** Размер чанка в символах */
  chunkSize: number;
  /** Размер перекрытия между чанками в символах */
  chunkOverlap: number;
  /** Поддерживаемые кодировки текста */
  supportedEncodings: string[];
  /** Включить детальное логирование */
  enableVerboseLogging: boolean;
  /** Включить потоковую обработку */
  enableStreaming: boolean;
  /** Максимальное количество страниц для обработки */
  maxPages?: number;
  /** Включить извлечение метаданных */
  extractMetadata: boolean;
  /** Включить извлечение координат текста */
  extractCoordinates: boolean;
  /** Настройки для различных языков */
  languageSettings?: Record<string, LanguageSettings>;
  /** Настройки для мультимодальной обработки */
  multimodalSettings?: MultimodalSettings;
  /** Настройки для производительности */
  performanceSettings?: PerformanceSettings;
  /** Настройки для безопасности */
  securitySettings?: SecuritySettings;
}

/**
 * Интерфейс для настроек языка.
 * Параметры обработки текста для конкретного языка.
 */
export interface LanguageSettings {
  /** Окончания предложений */
  sentenceEndings: string[];
  /** Сокращения */
  abbreviations: string[];
  /** Границы слов */
  wordBoundaries: RegExp;
  /** Размер чанка */
  chunkSize: number;
  /** Размер перекрытия */
  chunkOverlap: number;
}

/**
 * Интерфейс для настроек мультимодальной обработки.
 * Параметры для обработки различных типов контента.
 */
export interface MultimodalSettings {
  /** Настройки для изображений */
  image: ImageSettings;
  /** Настройки для таблиц */
  table: TableSettings;
  /** Настройки для графиков */
  graphic: GraphicSettings;
  /** Настройки для формул */
  formula: FormulaSettings;
}

/**
 * Интерфейс для настроек изображений.
 * Параметры обработки изображений в документах.
 */
export interface ImageSettings {
  /** Максимальный размер файла */
  maxFileSize: number;
  /** Поддерживаемые форматы */
  supportedFormats: string[];
  /** Максимальные размеры */
  maxDimensions: { width: number; height: number };
  /** Минимальные размеры */
  minDimensions: { width: number; height: number };
  /** Качество сжатия */
  compressionQuality: number;
}

/**
 * Интерфейс для настроек таблиц.
 * Параметры обработки таблиц в документах.
 */
export interface TableSettings {
  /** Максимальное количество строк */
  maxRows: number;
  /** Максимальное количество столбцов */
  maxColumns: number;
  /** Минимальное количество строк */
  minRows: number;
  /** Минимальное количество столбцов */
  minColumns: number;
  /** Порог определения заголовков */
  headerDetectionThreshold: number;
}

/**
 * Интерфейс для настроек графиков.
 * Параметры обработки графиков в документах.
 */
export interface GraphicSettings {
  /** Максимальный размер файла */
  maxFileSize: number;
  /** Поддерживаемые форматы */
  supportedFormats: string[];
  /** Порог анализа */
  analysisThreshold: number;
}

/**
 * Интерфейс для настроек формул.
 * Параметры обработки математических формул.
 */
export interface FormulaSettings {
  /** Максимальная длина формулы */
  maxLength: number;
  /** Поддерживаемые форматы */
  supportedFormats: string[];
  /** Порог распознавания */
  recognitionThreshold: number;
}

/**
 * Интерфейс для настроек производительности.
 * Параметры оптимизации производительности.
 */
export interface PerformanceSettings {
  /** Максимальное количество одновременных операций */
  maxConcurrentOperations: number;
  /** Максимальное использование памяти */
  maxMemoryUsage: number;
  /** Порог сборки мусора */
  gcThreshold: number;
  /** Размер батча */
  batchSize: number;
  /** Порог потоковой обработки */
  streamingThreshold: number;
  /** Порог сжатия */
  compressionThreshold: number;
}

/**
 * Интерфейс для настроек безопасности.
 * Параметры обеспечения безопасности.
 */
export interface SecuritySettings {
  /** Максимальный размер файла */
  maxFileSize: number;
  /** Разрешенные типы файлов */
  allowedFileTypes: string[];
  /** Заблокированные типы файлов */
  blockedFileTypes: string[];
  /** Сканировать на вредоносное ПО */
  scanForMalware: boolean;
  /** Очищать контент */
  sanitizeContent: boolean;
  /** Максимальный уровень вложенности */
  maxNestingLevel: number;
  /** Максимальная длина строки */
  maxStringLength: number;
}

/**
 * Интерфейс для результата обработки документа.
 * Расширенный результат с дополнительной информацией.
 */
export interface DocumentProcessingResult {
  /** Успешность обработки */
  success: boolean;
  /** Обработанные чанки */
  chunks: DocumentChunk[];
  /** Метаданные документа */
  metadata: DocumentMetadata;
  /** Статистика обработки */
  statistics: ProcessingStatistics;
  /** Ошибка при обработке */
  error?: string;
  /** Время обработки */
  processingTime: number;
  /** Дополнительные метаданные */
  additionalMetadata?: Record<string, unknown>;
}

/**
 * Интерфейс для метаданных документа.
 * Расширенные метаданные с дополнительной информацией.
 */
export interface DocumentMetadata {
  /** Название документа */
  title?: string;
  /** Автор документа */
  author?: string;
  /** Дата создания */
  creationDate?: string;
  /** Дата последнего изменения */
  modificationDate?: string;
  /** Количество страниц */
  pageCount: number;
  /** Размер файла в байтах */
  fileSize: number;
  /** Версия документа */
  version?: string;
  /** Ключевые слова */
  keywords?: string[];
  /** Тема документа */
  subject?: string;
  /** Создатель документа */
  creator?: string;
  /** Программа создания */
  producer?: string;
  /** Язык документа */
  language?: string;
  /** Кодировка текста */
  encoding?: string;
  /** Дополнительные метаданные */
  additional?: Record<string, unknown>;
}

/**
 * Интерфейс для статистики обработки.
 * Детальная статистика процесса обработки документа.
 */
export interface ProcessingStatistics {
  /** Общее количество символов */
  totalCharacters: number;
  /** Общее количество слов */
  totalWords: number;
  /** Общее количество предложений */
  totalSentences: number;
  /** Общее количество абзацев */
  totalParagraphs: number;
  /** Количество созданных чанков */
  chunksCount: number;
  /** Средняя длина чанка */
  averageChunkLength: number;
  /** Время чтения файла */
  readingTime: number;
  /** Время парсинга */
  parsingTime: number;
  /** Время создания чанков */
  chunkingTime: number;
  /** Время обработки мультимодального контента */
  multimodalProcessingTime: number;
  /** Использование памяти */
  memoryUsage: number;
  /** Статистика по типам контента */
  contentTypeStats: ContentTypeStatistics;
}

/**
 * Интерфейс для статистики по типам контента.
 * Статистика обработки различных типов контента.
 */
export interface ContentTypeStatistics {
  /** Количество текстовых блоков */
  textBlocks: number;
  /** Количество изображений */
  images: number;
  /** Количество таблиц */
  tables: number;
  /** Количество графиков */
  graphics: number;
  /** Количество формул */
  formulas: number;
  /** Общий размер текста */
  textSize: number;
  /** Общий размер изображений */
  imageSize: number;
  /** Общий размер таблиц */
  tableSize: number;
}

/**
 * Интерфейс для опций обработки документа.
 * Расширенные опции с дополнительными параметрами.
 */
export interface DocumentProcessingOptions {
  /** Callback для отслеживания прогресса */
  onProgress?: (progress: ProcessingProgress) => void;
  /** Идентификатор чата */
  chatId?: string;
  /** Дополнительные метаданные */
  metadata?: Record<string, unknown>;
  /** Таймаут обработки */
  timeout?: number;
  /** Принудительная обработка */
  forceProcessing?: boolean;
  /** Включить мультимодальную обработку */
  enableMultimodal?: boolean;
  /** Включить извлечение изображений */
  extractImages?: boolean;
  /** Включить извлечение таблиц */
  extractTables?: boolean;
  /** Включить извлечение графиков */
  extractGraphics?: boolean;
  /** Включить извлечение формул */
  extractFormulas?: boolean;
  /** Настройки языка */
  language?: string;
  /** Настройки кодировки */
  encoding?: string;
  /** Максимальный размер чанка */
  maxChunkSize?: number;
  /** Размер перекрытия чанков */
  chunkOverlap?: number;
}

/**
 * Интерфейс для прогресса обработки документа.
 * Детальная информация о прогрессе обработки.
 */
export interface ProcessingProgress {
  /** Текущий этап обработки */
  stage: ProcessingStage;
  /** Прогресс в процентах (0-100) */
  progress: number;
  /** Текущая обрабатываемая страница */
  currentPage?: number;
  /** Общее количество страниц */
  totalPages?: number;
  /** Сообщение о текущем состоянии */
  message: string;
  /** Дополнительная информация */
  details?: string;
  /** Время начала этапа */
  stageStartTime?: number;
  /** Ожидаемое время завершения */
  estimatedTimeRemaining?: number;
  /** Статистика текущего этапа */
  stageStatistics?: Record<string, unknown>;
}

/**
 * Типы этапов обработки документа.
 * Возможные этапы процесса обработки.
 */
export type ProcessingStage =
  | 'initializing'
  | 'reading'
  | 'parsing'
  | 'extracting-metadata'
  | 'analyzing-content'
  | 'chunking'
  | 'processing-multimodal'
  | 'validating'
  | 'completed'
  | 'error';

/**
 * Интерфейс для результата валидации документа.
 * Результат проверки корректности документа.
 */
export interface DocumentValidationResult {
  /** Валидность документа */
  isValid: boolean;
  /** Сообщения об ошибках */
  errors: string[];
  /** Предупреждения */
  warnings: string[];
  /** Информационные сообщения */
  info: string[];
  /** Детали валидации */
  details: ValidationDetails;
}

/**
 * Интерфейс для деталей валидации.
 * Подробная информация о процессе валидации.
 */
export interface ValidationDetails {
  /** Проверка размера файла */
  fileSizeCheck: boolean;
  /** Проверка формата файла */
  formatCheck: boolean;
  /** Проверка структуры */
  structureCheck: boolean;
  /** Проверка метаданных */
  metadataCheck: boolean;
  /** Проверка содержимого */
  contentCheck: boolean;
  /** Проверка безопасности */
  securityCheck: boolean;
  /** Дополнительные проверки */
  additionalChecks: Record<string, boolean>;
}

/**
 * Интерфейс для результата извлечения контента.
 * Результат извлечения различных типов контента.
 */
export interface ContentExtractionResult {
  /** Успешность извлечения */
  success: boolean;
  /** Извлеченный контент */
  content: ExtractedContent[];
  /** Статистика извлечения */
  statistics: ExtractionStatistics;
  /** Ошибки при извлечении */
  errors?: string[];
}

/**
 * Интерфейс для извлеченного контента.
 * Структурированная информация о контенте.
 */
export interface ExtractedContent {
  /** Тип контента */
  type: ContentType;
  /** Содержимое */
  content: string;
  /** Координаты на странице */
  coordinates?: ContentCoordinates;
  /** Метаданные контента */
  metadata: ContentMetadata;
  /** Уровень уверенности */
  confidence: number;
}

/**
 * Типы контента в документе.
 * Возможные типы контента для извлечения.
 */
export type ContentType =
  | 'text'
  | 'image'
  | 'table'
  | 'graphic'
  | 'formula'
  | 'chart'
  | 'diagram'
  | 'list'
  | 'header'
  | 'footer'
  | 'annotation'
  | 'link'
  | 'unknown';

/**
 * Интерфейс для координат контента.
 * Позиционирование контента на странице.
 */
export interface ContentCoordinates {
  /** X-координата */
  x: number;
  /** Y-координата */
  y: number;
  /** Ширина */
  width: number;
  /** Высота */
  height: number;
  /** Номер страницы */
  pageNumber: number;
  /** Дополнительные координаты */
  additional?: Record<string, number>;
}

/**
 * Интерфейс для метаданных контента.
 * Дополнительная информация о контенте.
 */
export interface ContentMetadata {
  /** Формат контента */
  format?: string;
  /** Размер в байтах */
  size?: number;
  /** Качество */
  quality?: number;
  /** Цветовая схема */
  colorScheme?: string;
  /** Шрифт */
  font?: string;
  /** Размер шрифта */
  fontSize?: number;
  /** Стиль шрифта */
  fontStyle?: string;
  /** Дополнительные метаданные */
  additional?: Record<string, unknown>;
}

/**
 * Интерфейс для статистики извлечения.
 * Статистика процесса извлечения контента.
 */
export interface ExtractionStatistics {
  /** Общее количество элементов */
  totalElements: number;
  /** Количество по типам */
  elementsByType: Record<ContentType, number>;
  /** Время извлечения */
  extractionTime: number;
  /** Использование памяти */
  memoryUsage: number;
  /** Успешность извлечения */
  successRate: number;
}

/**
 * Интерфейс для метаданных PDF документа.
 * Содержит информацию о документе для контекстного понимания.
 */
export interface PDFMetadata {
  /** Название документа */
  title?: string;
  /** Автор документа */
  author?: string;
  /** Дата создания документа */
  creationDate?: string;
  /** Дата последнего изменения */
  modificationDate?: string;
  /** Количество страниц в документе */
  pageCount: number;
  /** Размер файла в байтах */
  fileSize: number;
  /** Версия PDF */
  pdfVersion?: string;
  /** Ключевые слова документа */
  keywords?: string[];
  /** Тема документа */
  subject?: string;
  /** Создатель документа */
  creator?: string;
  /** Программа создания документа */
  producer?: string;
}

/**
 * Интерфейс для информации о странице PDF.
 * Содержит структурированную информацию о содержимом страницы.
 */
export interface PDFPageInfo {
  /** Номер страницы (начиная с 1) */
  pageNumber: number;
  /** Извлеченный текст страницы */
  text: string;
  /** Размеры страницы в точках */
  dimensions: {
    width: number;
    height: number;
  };
  /** Координаты текстовых блоков */
  textBlocks: TextBlock[];
  /** Количество символов на странице */
  characterCount: number;
  /** Количество слов на странице */
  wordCount: number;
}

/**
 * Интерфейс для текстового блока на странице.
 * Представляет структурированную информацию о тексте.
 */
export interface TextBlock {
  /** Содержимое текстового блока */
  content: string;
  /** Координаты блока на странице */
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Размер шрифта */
  fontSize?: number;
  /** Семейство шрифта */
  fontFamily?: string;
  /** Стиль шрифта */
  fontStyle?: 'normal' | 'bold' | 'italic';
}

/**
 * Интерфейс для результата обработки PDF документа.
 * Содержит полную информацию об обработанном документе.
 */
export interface PDFProcessingResult {
  /** Успешность обработки */
  success: boolean;
  /** Метаданные документа */
  metadata: PDFMetadata;
  /** Информация о страницах */
  pages: PDFPageInfo[];
  /** Общее количество символов в документе */
  totalCharacterCount: number;
  /** Общее количество слов в документе */
  totalWordCount: number;
  /** Время обработки в миллисекундах */
  processingTime: number;
  /** Ошибка при обработке */
  error?: string;
}

/**
 * Интерфейс для прогресса обработки документа.
 * Используется для отслеживания длительных операций.
 */
export interface ProcessingProgress {
  /** Текущий этап обработки */
  stage: ProcessingStage;
  /** Прогресс в процентах (0-100) */
  progress: number;
  /** Текущая обрабатываемая страница */
  currentPage?: number;
  /** Общее количество страниц */
  totalPages?: number;
  /** Сообщение о текущем состоянии */
  message: string;
}

/**
 * Интерфейс для конфигурации обработки документов.
 * Настройки для различных типов документов и режимов обработки.
 */
export interface DocumentProcessorConfig {
  /** Максимальный размер файла в байтах */
  maxFileSize: number;
  /** Размер чанка в символах */
  chunkSize: number;
  /** Размер перекрытия между чанками в символах */
  chunkOverlap: number;
  /** Поддерживаемые кодировки текста */
  supportedEncodings: string[];
  /** Включить детальное логирование */
  enableVerboseLogging: boolean;
  /** Включить потоковую обработку */
  enableStreaming: boolean;
  /** Максимальное количество страниц для обработки */
  maxPages?: number;
  /** Включить извлечение метаданных */
  extractMetadata: boolean;
  /** Включить извлечение координат текста */
  extractCoordinates: boolean;
}

/**
 * Абстрактный интерфейс для процессоров документов.
 * Базовый интерфейс для всех типов процессоров документов.
 */
export interface DocumentProcessor<
  TInput = Buffer,
  TOutput = PDFProcessingResult,
> {
  /** Уникальный идентификатор процессора */
  readonly processorId: string;
  /** Поддерживаемые типы файлов */
  readonly supportedFileTypes: string[];
  /** Конфигурация процессора */
  readonly config: DocumentProcessorConfig;

  /**
   * Проверяет, поддерживает ли процессор указанный тип файла.
   * @param fileType - Тип файла для проверки
   * @returns true если тип файла поддерживается
   */
  supportsFileType(fileType: string): boolean;

  /**
   * Обрабатывает документ и возвращает результат.
   * @param input - Входные данные документа
   * @param options - Опции обработки
   * @returns Promise с результатом обработки
   */
  process(
    input: TInput,
    options?: ProcessingOptions
  ): Promise<OperationResult<TOutput>>;

  /**
   * Валидирует входные данные перед обработкой.
   * @param input - Входные данные для валидации
   * @returns Результат валидации
   */
  validate(input: TInput): OperationResult<boolean>;

  /**
   * Получает метаданные документа без полной обработки.
   * @param input - Входные данные документа
   * @returns Promise с метаданными
   */
  extractMetadata(input: TInput): Promise<OperationResult<PDFMetadata>>;
}

/**
 * Интерфейс для мультимодальных процессоров.
 * Расширяет базовый процессор для работы с различными типами контента.
 */
export interface MultimodalProcessor<
  TInput = Buffer,
  TOutput = PDFProcessingResult,
> extends DocumentProcessor<TInput, TOutput> {
  /** Поддерживаемые типы мультимодального контента */
  readonly supportedContentTypes: string[];

  /**
   * Обрабатывает графики и диаграммы в документе.
   * @param input - Входные данные документа
   * @param options - Опции обработки
   * @returns Promise с результатом обработки графиков
   */
  processGraphics?(
    input: TInput,
    options?: ProcessingOptions
  ): Promise<OperationResult<unknown>>;

  /**
   * Обрабатывает таблицы в документе.
   * @param input - Входные данные документа
   * @param options - Опции обработки
   * @returns Promise с результатом обработки таблиц
   */
  processTables?(
    input: TInput,
    options?: ProcessingOptions
  ): Promise<OperationResult<unknown>>;

  /**
   * Обрабатывает изображения в документе.
   * @param input - Входные данные документа
   * @param options - Опции обработки
   * @returns Promise с результатом обработки изображений
   */
  processImages?(
    input: TInput,
    options?: ProcessingOptions
  ): Promise<OperationResult<unknown>>;
}

/**
 * Интерфейс для опций обработки документов.
 * Дополнительные параметры для настройки процесса обработки.
 */
export interface ProcessingOptions {
  /** Callback для отслеживания прогресса */
  onProgress?: (progress: ProcessingProgress) => void;
  /** Идентификатор чата для контекста */
  chatId?: string;
  /** Дополнительные метаданные */
  metadata?: Record<string, unknown>;
  /** Таймаут обработки в миллисекундах */
  timeout?: number;
  /** Принудительная обработка без кэширования */
  forceProcessing?: boolean;
}

/**
 * Интерфейс для плагинов обработки документов.
 * Система расширений для добавления новой функциональности.
 */
export interface DocumentProcessorPlugin {
  /** Уникальное имя плагина */
  readonly name: string;
  /** Версия плагина */
  readonly version: string;
  /** Описание плагина */
  readonly description: string;
  /** Поддерживаемые типы файлов */
  readonly supportedFileTypes: string[];

  /**
   * Инициализирует плагин.
   * @param config - Конфигурация плагина
   * @returns Promise с результатом инициализации
   */
  initialize(config?: Record<string, unknown>): Promise<OperationResult<void>>;

  /**
   * Обрабатывает документ с помощью плагина.
   * @param input - Входные данные документа
   * @param options - Опции обработки
   * @returns Promise с результатом обработки
   */
  process(
    input: Buffer,
    options?: ProcessingOptions
  ): Promise<OperationResult<unknown>>;

  /**
   * Очищает ресурсы плагина.
   * @returns Promise с результатом очистки
   */
  cleanup(): Promise<OperationResult<void>>;
}

/**
 * Интерфейс для информации о кодировке текста.
 * Содержит метаданные о кодировке и способах её определения.
 */
export interface EncodingInfo {
  /** Название кодировки */
  encoding: string;
  /** Уровень уверенности в определении кодировки (0-1) */
  confidence: number;
  /** Язык текста */
  language?: string;
  /** Дополнительные метаданные */
  metadata?: Record<string, unknown>;
}

/**
 * Интерфейс для результата анализа текста.
 * Содержит информацию о структуре и характеристиках текста.
 */
export interface TextAnalysisResult {
  /** Общее количество символов */
  characterCount: number;
  /** Общее количество слов */
  wordCount: number;
  /** Общее количество предложений */
  sentenceCount: number;
  /** Общее количество абзацев */
  paragraphCount: number;
  /** Средняя длина слова */
  averageWordLength: number;
  /** Средняя длина предложения */
  averageSentenceLength: number;
  /** Определенная кодировка */
  encoding: EncodingInfo;
  /** Язык текста */
  language?: string;
  /** Статистика по символам */
  characterStats: {
    /** Количество пробелов */
    spaces: number;
    /** Количество знаков препинания */
    punctuation: number;
    /** Количество цифр */
    digits: number;
    /** Количество букв */
    letters: number;
  };
}

/**
 * Интерфейс для мультимодального контента.
 * Представляет различные типы контента в документах.
 */
export interface MultimodalContent {
  /** Тип контента */
  type: 'text' | 'image' | 'table' | 'graphic' | 'formula';
  /** Содержимое контента */
  content: string;
  /** Координаты на странице */
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Метаданные контента */
  metadata?: Record<string, unknown>;
}
