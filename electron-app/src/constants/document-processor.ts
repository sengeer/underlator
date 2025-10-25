/**
 * @module DocumentProcessorConstants
 * Константы для сервиса обработки документов.
 * Содержит настройки по умолчанию и ограничения для различных типов документов.
 */

/**
 * Конфигурация по умолчанию для обработки документов.
 * Базовые настройки для всех типов документов.
 */
export const DEFAULT_DOCUMENT_PROCESSOR_CONFIG = {
  /** Максимальный размер файла в байтах (50MB) */
  maxFileSize: 50 * 1024 * 1024,
  /** Размер чанка в символах */
  chunkSize: 512,
  /** Размер перекрытия между чанками в символах */
  chunkOverlap: 50,
  /** Поддерживаемые кодировки текста */
  supportedEncodings: [
    'utf-8',
    'windows-1251',
    'iso-8859-1',
    'iso-8859-5',
    'koi8-r',
    'cp1252',
  ],
  /** Включить детальное логирование */
  enableVerboseLogging: true,
  /** Включить потоковую обработку */
  enableStreaming: true,
  /** Максимальное количество страниц для обработки */
  maxPages: 1000,
  /** Включить извлечение метаданных */
  extractMetadata: true,
  /** Включить извлечение координат текста */
  extractCoordinates: true,
} as const;

/**
 * Ограничения для различных типов файлов.
 * Максимальные размеры и параметры для каждого типа документа.
 */
export const FILE_TYPE_LIMITS = {
  pdf: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxPages: 2000,
    maxChunkSize: 1024,
    supportedVersions: [
      '1.0',
      '1.1',
      '1.2',
      '1.3',
      '1.4',
      '1.5',
      '1.6',
      '1.7',
      '2.0',
    ],
  },
  docx: {
    maxFileSize: 25 * 1024 * 1024, // 25MB
    maxPages: 500,
    maxChunkSize: 512,
    supportedVersions: ['2007', '2010', '2013', '2016', '2019', '2021'],
  },
  txt: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxPages: 1,
    maxChunkSize: 1024,
    supportedEncodings: ['utf-8', 'windows-1251', 'iso-8859-1'],
  },
  rtf: {
    maxFileSize: 15 * 1024 * 1024, // 15MB
    maxPages: 300,
    maxChunkSize: 512,
    supportedVersions: ['1.0', '1.5', '1.6', '1.7'],
  },
} as const;

/**
 * Настройки для обработки различных языков.
 * Параметры для оптимизации обработки текста на разных языках.
 */
export const LANGUAGE_SETTINGS = {
  ru: {
    sentenceEndings: ['.', '!', '?', '…'],
    abbreviations: [
      'т.е.',
      'т.д.',
      'и т.п.',
      'и др.',
      'и пр.',
      'см.',
      'стр.',
      'гл.',
      'разд.',
    ],
    wordBoundaries: /\b/,
    chunkSize: 512,
    chunkOverlap: 50,
  },
  en: {
    sentenceEndings: ['.', '!', '?', '…'],
    abbreviations: [
      'e.g.',
      'i.e.',
      'etc.',
      'vs.',
      'Dr.',
      'Mr.',
      'Mrs.',
      'Prof.',
      'Inc.',
      'Ltd.',
    ],
    wordBoundaries: /\b/,
    chunkSize: 512,
    chunkOverlap: 50,
  },
  de: {
    sentenceEndings: ['.', '!', '?', '…'],
    abbreviations: [
      'z.B.',
      'd.h.',
      'usw.',
      'bzw.',
      'Prof.',
      'Dr.',
      'GmbH',
      'AG',
    ],
    wordBoundaries: /\b/,
    chunkSize: 512,
    chunkOverlap: 50,
  },
  fr: {
    sentenceEndings: ['.', '!', '?', '…'],
    abbreviations: [
      'p.ex.',
      'c.-à-d.',
      'etc.',
      'M.',
      'Mme',
      'Dr.',
      'Prof.',
      'S.A.',
      'S.A.R.L.',
    ],
    wordBoundaries: /\b/,
    chunkSize: 512,
    chunkOverlap: 50,
  },
} as const;

/**
 * Настройки для мультимодальной обработки.
 * Параметры для обработки различных типов контента.
 */
export const MULTIMODAL_SETTINGS = {
  image: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
    maxDimensions: { width: 4096, height: 4096 },
    minDimensions: { width: 10, height: 10 },
    compressionQuality: 0.8,
  },
  table: {
    maxRows: 1000,
    maxColumns: 50,
    minRows: 2,
    minColumns: 2,
    headerDetectionThreshold: 0.7,
  },
  graphic: {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    supportedFormats: ['svg', 'eps', 'pdf'],
    analysisThreshold: 0.6,
  },
  formula: {
    maxLength: 1000,
    supportedFormats: ['latex', 'mathml', 'asciimath'],
    recognitionThreshold: 0.8,
  },
} as const;

/**
 * Настройки для прогресс-индикаторов.
 * Параметры для отображения прогресса обработки документов.
 */
export const PROGRESS_SETTINGS = {
  updateInterval: 100, // миллисекунды
  stages: {
    reading: { weight: 0.1, description: 'Чтение файла' },
    parsing: { weight: 0.3, description: 'Парсинг документа' },
    chunking: { weight: 0.4, description: 'Разбиение на фрагменты' },
    processing: { weight: 0.2, description: 'Обработка контента' },
  },
  timeout: {
    reading: 30000, // 30 секунд
    parsing: 60000, // 1 минута
    chunking: 30000, // 30 секунд
    processing: 120000, // 2 минуты
  },
} as const;

/**
 * Настройки для обработки ошибок.
 * Параметры для обработки различных типов ошибок.
 */
export const ERROR_SETTINGS = {
  retryAttempts: 3,
  retryDelay: 1000, // миллисекунды
  maxRetryDelay: 10000, // 10 секунд
  retryMultiplier: 2,
  criticalErrors: [
    'FILE_NOT_FOUND',
    'PERMISSION_DENIED',
    'INVALID_FORMAT',
    'CORRUPTED_FILE',
    'MEMORY_LIMIT_EXCEEDED',
  ],
  recoverableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'TEMPORARY_FAILURE',
    'RATE_LIMIT',
  ],
} as const;

/**
 * Настройки для кэширования.
 * Параметры для кэширования обработанных документов.
 */
export const CACHE_SETTINGS = {
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  maxCacheEntries: 1000,
  cacheTimeout: 24 * 60 * 60 * 1000, // 24 часа
  cleanupInterval: 60 * 60 * 1000, // 1 час
  compressionEnabled: true,
  compressionLevel: 6,
} as const;

/**
 * Настройки для логирования.
 * Параметры для логирования операций обработки документов.
 */
export const LOGGING_SETTINGS = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4,
  },
  maxLogSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 5,
  logFormat: 'json',
  enableConsole: true,
  enableFile: true,
  logDirectory: 'logs',
} as const;

/**
 * Настройки для производительности.
 * Параметры для оптимизации производительности обработки.
 */
export const PERFORMANCE_SETTINGS = {
  maxConcurrentOperations: 5,
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  gcThreshold: 0.8, // 80% использования памяти
  batchSize: 100,
  streamingThreshold: 1024 * 1024, // 1MB
  compressionThreshold: 10 * 1024, // 10KB
} as const;

/**
 * Настройки для безопасности.
 * Параметры для обеспечения безопасности обработки документов.
 */
export const SECURITY_SETTINGS = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedFileTypes: ['pdf', 'docx', 'txt', 'rtf'],
  blockedFileTypes: ['exe', 'bat', 'cmd', 'scr', 'pif', 'com'],
  scanForMalware: false, // Требует дополнительной библиотеки
  sanitizeContent: true,
  maxNestingLevel: 10,
  maxStringLength: 1000000, // 1MB строки
} as const;

/**
 * Настройки для интеграции с внешними сервисами.
 * Параметры для интеграции с различными API и сервисами.
 */
export const INTEGRATION_SETTINGS = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    timeout: 30000,
    maxRetries: 3,
    embeddingModel: 'nomic-embed-text',
  },
  vectorStore: {
    type: 'qdrant',
    host: 'localhost',
    port: 6333,
    collectionPrefix: 'underlator_',
    vectorSize: 768,
  },
  pdfParse: {
    maxPages: 1000,
    extractImages: true,
    extractTables: true,
    extractMetadata: true,
  },
} as const;

/**
 * Настройки для тестирования.
 * Параметры для тестирования функциональности обработки документов.
 */
export const TESTING_SETTINGS = {
  mockProcessing: false,
  testDataPath: 'test-data',
  testTimeout: 30000, // 30 секунд
  testRetries: 2,
  enableCoverage: true,
  coverageThreshold: 80,
} as const;

/**
 * Получает настройки для указанного типа файла.
 * Возвращает ограничения и параметры для конкретного типа документа.
 */
export function getFileTypeSettings(fileType: string) {
  const normalizedType = fileType.toLowerCase();
  return (
    FILE_TYPE_LIMITS[normalizedType as keyof typeof FILE_TYPE_LIMITS] ||
    FILE_TYPE_LIMITS.txt
  );
}

/**
 * Получает настройки для указанного языка.
 * Возвращает параметры обработки для конкретного языка.
 */
export function getLanguageSettings(language: string) {
  return (
    LANGUAGE_SETTINGS[language as keyof typeof LANGUAGE_SETTINGS] ||
    LANGUAGE_SETTINGS.en
  );
}

/**
 * Проверяет, поддерживается ли указанный тип файла.
 * Возвращает true если тип файла поддерживается системой.
 */
export function isFileTypeSupported(fileType: string): boolean {
  const normalizedType = fileType.toLowerCase();
  return normalizedType in FILE_TYPE_LIMITS;
}

/**
 * Проверяет, поддерживается ли указанный язык.
 * Возвращает true если язык поддерживается системой.
 */
export function isLanguageSupported(language: string): boolean {
  return language in LANGUAGE_SETTINGS;
}

/**
 * Получает максимальный размер файла для указанного типа.
 * Возвращает ограничение размера для конкретного типа документа.
 */
export function getMaxFileSize(fileType: string): number {
  const settings = getFileTypeSettings(fileType);
  return settings.maxFileSize;
}

/**
 * Получает максимальное количество страниц для указанного типа.
 * Возвращает ограничение страниц для конкретного типа документа.
 */
export function getMaxPages(fileType: string): number {
  const settings = getFileTypeSettings(fileType);
  return settings.maxPages;
}
