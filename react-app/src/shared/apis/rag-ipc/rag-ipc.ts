/**
 * @module RagIpc
 * IPC клиент для взаимодействия с RAG системой.
 */

import log from '../../lib/utils/log';
import type {
  RagApiConfig,
  ProcessDocumentRequest,
  UploadAndProcessDocumentRequest,
  ProcessDocumentResult,
  RagQueryRequest,
  DeleteCollectionRequest,
  DeleteCollectionResult,
  RagProcessingProgress,
  RagResponse,
  VectorCollection,
  CollectionStats,
  UploadAndProcessDocumentConfig,
} from './types/rag-ipc';

/**
 * @class RagIpc
 *
 * Класс для работы с RAG системой через IPC.
 * Предоставляет методы для обработки документов, поиска и управления коллекциями.
 */
class RagIpc {
  private config: RagApiConfig;

  constructor(config?: Partial<RagApiConfig>) {
    this.config = {
      timeout: config?.timeout || 30000,
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 1000,
    };
  }

  /**
   * Обрабатывает PDF документ и создает эмбеддинги.
   *
   * @param params - Параметры обработки документа.
   * @returns Promise с результатом обработки.
   */
  async processDocument(
    params: ProcessDocumentRequest
  ): Promise<ProcessDocumentResult> {
    log('Параметры processDocument:', params);

    try {
      const response = await (window as any).electron.rag.processDocument({
        filePath: params.filePath,
        chatId: params.chatId,
      });

      log('Результат processDocument:', response);

      // Извлекает data из обертки IPC
      if (!response.success) {
        throw new Error(response.error || 'Unknown error');
      }

      return response.data as ProcessDocumentResult;
    } catch (error) {
      this.handleError('processDocument', error);
      throw error;
    }
  }

  /**
   * Ищет релевантные документы по запросу.
   *
   * @param params - Параметры поиска.
   * @returns Promise с результатами поиска.
   */
  async queryDocuments(
    params: RagQueryRequest,
    config: QueryDocumentsConfig
  ): Promise<RagResponse> {
    log('Параметры queryDocuments:', params);

    try {
      const response = await (window as any).electron.rag.queryDocuments(
        {
          query: params.query,
          chatId: params.chatId,
        },
        config
      );

      log('Результат queryDocuments:', response);

      // Извлекает data из обертки IPC
      if (!response.success) {
        throw new Error(response.error || 'Unknown error');
      }

      return response.data as RagResponse;
    } catch (error) {
      this.handleError('queryDocuments', error);
      throw error;
    }
  }

  /**
   * Удаляет коллекцию документов для чата.
   *
   * @param params - Параметры удаления.
   * @returns Promise с результатом удаления.
   */
  async deleteDocumentCollection(
    params: DeleteCollectionRequest
  ): Promise<DeleteCollectionResult> {
    try {
      const response = await (
        window as any
      ).electron.rag.deleteDocumentCollection({
        chatId: params.chatId,
      });

      log('Результат deleteDocumentCollection:', response);

      // Извлекает data из обертки IPC
      if (!response.success) {
        throw new Error(response.error || 'Unknown error');
      }

      return response.data as DeleteCollectionResult;
    } catch (error) {
      this.handleError('deleteDocumentCollection', error);
      throw error;
    }
  }

  /**
   * Получает статистику коллекции.
   *
   * @param chatId - Идентификатор чата.
   * @returns Promise со статистикой коллекции.
   */
  async getCollectionStats(chatId: string): Promise<CollectionStats> {
    log('ID getCollectionStats:', chatId);

    try {
      const response = await (window as any).electron.rag.getCollectionStats(
        chatId
      );
      log('Результат getCollectionStats:', response);

      // Извлекает data из обертки IPC
      if (!response.success) {
        throw new Error(response.error || 'Unknown error');
      }

      return response.data as CollectionStats;
    } catch (error) {
      this.handleError('getCollectionStats', error);
      throw error;
    }
  }

  /**
   * Получает список всех коллекций.
   *
   * @returns Promise со списком коллекций.
   */
  async listCollections(): Promise<VectorCollection[]> {
    try {
      const response = await (window as any).electron.rag.listCollections();
      log('Результат listCollections:', response);

      // Проверяет что response это IPC обертка
      if (response && typeof response === 'object' && 'success' in response) {
        // IPC обертка
        if (!response.success) {
          throw new Error(response.error || 'Unknown error');
        }
        return (response.data || []) as VectorCollection[];
      } else if (Array.isArray(response)) {
        // Уже массив
        return response;
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      this.handleError('listCollections', error);
      throw error;
    }
  }

  /**
   * Подписывается на события прогресса обработки документов.
   *
   * @param callback - Callback для обработки прогресса.
   * @returns Функция для отписки от событий.
   */
  onProcessingProgress(
    callback: (progress: RagProcessingProgress) => void
  ): () => void {
    try {
      return (window as any).electron.rag.onProcessingProgress(callback);
    } catch (error) {
      this.handleError('onProcessingProgress', error);
      throw error;
    }
  }

  /**
   * Загружает файл с диска и обрабатывает его.
   * Читает файл как ArrayBuffer и отправляет в main процесс.
   *
   * @param file - Файл для загрузки
   * @param chatId - ID чата
   * @returns Результат обработки
   */
  async uploadAndProcessDocument(
    file: File,
    chatId: string,
    config: UploadAndProcessDocumentConfig
  ): Promise<ProcessDocumentResult> {
    log(`uploadAndProcessDocument: ${file.name}, ${chatId}`);

    try {
      // Читает файл как ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Конвертирует в base64 безопасным способом для больших файлов
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192; // Обрабатывает по частям

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }

      const base64 = btoa(binary);

      // Отправляет в main процесс
      const request: UploadAndProcessDocumentRequest = {
        fileName: file.name,
        fileData: base64,
        fileType: file.type,
        chatId,
      };
      const response = await (
        window as any
      ).electron.rag.uploadAndProcessDocument(request, config);

      log('Результат uploadAndProcessDocument', response);

      // Извлекает data из обертки IPC
      if (!response.success) {
        throw new Error(response.error || 'Unknown error');
      }

      return response.data as ProcessDocumentResult;
    } catch (error) {
      this.handleError('uploadAndProcessDocument', error);
      throw error;
    }
  }

  /**
   * Обновляет конфигурацию API.
   *
   * @param newConfig - Новая конфигурация.
   */
  updateConfig(newConfig: Partial<RagApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Получает текущую конфигурацию API.
   *
   * @returns Текущая конфигурация.
   */
  getConfig(): RagApiConfig {
    return { ...this.config };
  }

  /**
   * Обрабатывает ошибку.
   *
   * @param method - Название метода.
   * @param error - Ошибка.
   */
  private handleError(method: string, error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[RAG IPC] ${method} error:`, errorMessage);
  }
}

/**
 * Создает экземпляр IPC клиента для RAG.
 *
 * @param config - Конфигурация API.
 * @returns Экземпляр Electron для работы с RAG.
 */
function createRagIpc(config?: Partial<RagApiConfig>): RagIpc {
  return new RagIpc(config);
}

/**
 * Экспорт по умолчанию.
 */
const ragIpc = createRagIpc();

export default ragIpc;
