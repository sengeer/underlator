/**
 * @module RagHandlersTypes
 * Типы для работы с IPC обработчиками RAG системы.
 * Предоставляет интерфейсы для запросов и ответов на них.
 */

import type { DocumentProcessingOptions } from './document-processor';
import type { DocumentChunk } from './rag';

/**
 * Интерфейс для запроса обработки документа.
 */
export interface ProcessDocumentRequest {
  /** Путь к PDF файлу */
  filePath: string;
  /** Идентификатор чата */
  chatId: string;
  /** Опции обработки */
  options?: DocumentProcessingOptions;
}

/**
 * Интерфейс для запроса загрузки и обработки документа.
 */
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
 * Интерфейс для результата обработки документа.
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
 * Интерфейс для запроса поиска документов.
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
 * Интерфейс для запроса удаления коллекции.
 */
export interface DeleteCollectionRequest {
  /** Идентификатор чата */
  chatId: string;
}

/**
 * Интерфейс для результата удаления коллекции.
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
 * Интерфейс для прогресса обработки документов.
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
