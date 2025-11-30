/**
 * @module RagIpcTypes
 * Типы для IPC взаимодействия с RAG системой.
 */

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    pageNumber: number;
    chunkIndex: number;
    chatId: string;
  };
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface RagResponse {
  answer: string;
  sources: DocumentSource[];
  confidence: number;
  searchMetadata: {
    searchTime: number;
    chunksFound: number;
    averageSimilarity: number;
    distanceMetric: string;
  };
  timestamp: string;
}

export interface DocumentSource {
  chunkId: string;
  content: string;
  relevance: number;
  metadata: {
    source: string;
    pageNumber: number;
    chunkIndex: number;
  };
}

export interface VectorCollection {
  name: string;
  chatId: string;
  vectorSize: number;
  distanceMetric: string;
  indexParams: {
    indexType: string;
    hnswConfig?: Record<string, number>;
    flatConfig?: Record<string, boolean>;
  };
  stats: CollectionStats;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionStats {
  pointsCount: number;
  sizeBytes: number;
  indexesCount: number;
  indexingStatus: 'idle' | 'indexing' | 'completed' | 'error';
  lastIndexedAt?: string;
}

/**
 * Конфигурация загрузки и обработки документа.
 */
export interface UploadAndProcessDocumentConfig {
  /** Размер чанка */
  chunkSize: number;
  /** Название модели эмбеддингов */
  embeddingModel?: string;
}

/**
 * Конфигурация API клиента RAG.
 */
export interface RagApiConfig {
  /** Таймаут для запросов в миллисекундах */
  timeout: number;
  /** Количество попыток при ошибках */
  retryAttempts: number;
  /** Задержка между попытками в миллисекундах */
  retryDelay: number;
}

/**
 * Запрос на обработку документа.
 */
export interface ProcessDocumentRequest {
  /** Путь к PDF файлу */
  filePath: string;
  /** Идентификатор чата */
  chatId: string;
}

export interface UploadAndProcessDocumentRequest {
  /** Имя файла */
  fileName: string;
  /** Данные файла в base64 */
  fileData: string;
  /** Тип файла */
  fileType: string;
  /** Идентификатор чата */
  chatId: string;
}

/**
 * Результат обработки документа.
 */
export interface ProcessDocumentResult {
  /** Успешность операции */
  success: boolean;
  /** Обработанные чанки */
  chunks: DocumentChunk[];
  /** Общее количество чанков */
  totalChunks: number;
  /** Ошибка при обработке */
  error?: string;
}

/**
 * Запрос на поиск документов.
 */
export interface RagQueryRequest {
  /** Текст запроса для поиска */
  query: string;
  /** Идентификатор чата */
  chatId: string;
  /** Количество возвращаемых результатов */
  topK?: number;
  /** Порог схожести (0.0 - 1.0) */
  similarityThreshold?: number;
}

/**
 * Запрос на удаление коллекции.
 */
export interface DeleteCollectionRequest {
  /** Идентификатор чата */
  chatId: string;
}

/**
 * Результат удаления коллекции.
 */
export interface DeleteCollectionResult {
  /** Успешность операции */
  success: boolean;
  /** ID удаленного чата */
  deletedChatId: string;
  /** Ошибка при обработке */
  error?: string;
}

/**
 * Прогресс обработки документов.
 */
export interface RagProcessingProgress {
  /** Этап обработки */
  stage: 'reading' | 'parsing' | 'chunking' | 'embedding';
  /** Прогресс в процентах (0-100) */
  progress: number;
  /** Сообщение о текущем состоянии */
  message: string;
  /** Дополнительная информация */
  details?: string;
}

/**
 * Ошибка RAG системы.
 */
export interface RagError {
  /** Тип ошибки */
  type: 'processing' | 'embedding' | 'search' | 'collection';
  /** Сообщение об ошибке */
  message: string;
  /** Детали ошибки */
  details?: unknown;
}
