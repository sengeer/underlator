/**
 * @module RagHandlers
 * IPC обработчики для работы с RAG системой через векторное хранилище.
 * Реализует операции обработки документов, поиска, управления коллекциями с валидацией, обработкой ошибок и логированием.
 */

import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IpcHandler } from './ipc-handlers';
import { VectorStoreService } from '../../services/vector-store';
import { DocumentProcessorService } from '../../services/document-processor';
import { EmbeddingService } from '../../services/embedding';
import { ErrorHandler } from '../../utils/error-handler';
import { getFileExtension } from '../../utils/file-utils';
import type {
  RagQuery,
  RagResponse,
  VectorCollection,
  CollectionStats,
  QueryDocumentsConfig,
  UploadAndProcessDocumentConfig,
} from '../../types/rag';
import type {
  ProcessDocumentRequest,
  ProcessDocumentResult,
  RagQueryRequest,
  DeleteCollectionRequest,
  DeleteCollectionResult,
  UploadAndProcessDocumentRequest,
} from '../../types/rag-handlers';

/**
 * @class RagHandlers
 *
 * Класс для управления IPC обработчиками RAG системы.
 * Обеспечивает безопасное взаимодействие между frontend и векторным хранилищем.
 */
export class RagHandlers {
  private vectorStoreService: VectorStoreService;
  private documentProcessorService: DocumentProcessorService | null;
  private embeddingService: EmbeddingService;
  private errorHandler: ErrorHandler;
  private isInitializingDocProcessor = false;

  /**
   * Создает экземпляр RagHandlers.
   *
   * @param vectorStoreService - Сервис для работы с векторным хранилищем.
   * @param documentProcessorService - Сервис для обработки документов (может быть null для ленивой инициализации).
   * @param embeddingService - Сервис для генерации эмбеддингов.
   */
  constructor(
    vectorStoreService: VectorStoreService,
    documentProcessorService: DocumentProcessorService | null,
    embeddingService: EmbeddingService
  ) {
    this.vectorStoreService = vectorStoreService;
    this.documentProcessorService = documentProcessorService;
    this.embeddingService = embeddingService;
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Получает DocumentProcessorService с ленивой инициализацией.
   */
  private async getDocumentProcessorService(): Promise<DocumentProcessorService> {
    if (this.documentProcessorService) {
      return this.documentProcessorService;
    }

    // Защита от множественных одновременных инициализаций
    if (this.isInitializingDocProcessor) {
      // Ждет завершения текущей инициализации
      while (this.isInitializingDocProcessor) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!this.documentProcessorService) {
        throw new Error('DocumentProcessorService не был инициализирован');
      }
      return this.documentProcessorService;
    }

    try {
      this.isInitializingDocProcessor = true;
      console.log('📄 Initializing DocumentProcessorService...');

      const module = await import('../../services/document-processor');
      const DocumentProcessorService = module.DocumentProcessorService;
      this.documentProcessorService = new DocumentProcessorService();
      const result = await this.documentProcessorService.initialize();

      if (result.success) {
        console.log('✅ DocumentProcessorService initialized');
      } else {
        console.error(
          'Failed to initialize DocumentProcessorService:',
          result.error
        );
      }
    } catch (error) {
      console.error('Failed to load DocumentProcessorService:', error);
      throw new Error('DocumentProcessorService не может быть загружен');
    } finally {
      this.isInitializingDocProcessor = false;
    }

    if (!this.documentProcessorService) {
      throw new Error('DocumentProcessorService не инициализирован');
    }

    return this.documentProcessorService;
  }

  /**
   * Регистрирует все IPC обработчики для RAG системы.
   * Настраивает обработчики для всех операций с документами и векторным хранилищем.
   */
  registerHandlers(): void {
    console.log('🔧 Registering RAG IPC handlers...');

    // Обработка PDF документов
    ipcMain.handle(
      'rag:process-document',
      IpcHandler.createHandlerWrapper(
        async (
          request: ProcessDocumentRequest,
          config?: UploadAndProcessDocumentConfig
        ): Promise<ProcessDocumentResult> => {
          return await this.handleProcessDocument(request, config);
        },
        'rag:process-document'
      )
    );

    // Обработчик поиска релевантных документов
    ipcMain.handle(
      'rag:query-documents',
      IpcHandler.createHandlerWrapper(
        async (
          request: RagQueryRequest,
          config: QueryDocumentsConfig
        ): Promise<RagResponse> => {
          return await this.handleQueryDocuments(request, config);
        },
        'rag:query-documents'
      )
    );

    // Обработчик удаления коллекции
    ipcMain.handle(
      'rag:delete-collection',
      IpcHandler.createHandlerWrapper(
        async (
          request: DeleteCollectionRequest
        ): Promise<DeleteCollectionResult> => {
          return await this.handleDeleteCollection(request);
        },
        'rag:delete-collection'
      )
    );

    // Обработчик получения статистики коллекции
    ipcMain.handle(
      'rag:get-collection-stats',
      IpcHandler.createHandlerWrapper(
        async (request: { chatId: string }): Promise<CollectionStats> => {
          return await this.handleGetCollectionStats(request);
        },
        'rag:get-collection-stats'
      )
    );

    // Обработчик получения списка коллекций
    ipcMain.handle('rag:list-collections', async () => {
      try {
        const result = await this.handleListCollections();
        return IpcHandler.createSuccessResponse(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return IpcHandler.createErrorResponse(errorMessage);
      }
    });

    // Обработчик загрузки и обработки документа
    ipcMain.handle(
      'rag:upload-and-process-document',
      IpcHandler.createHandlerWrapper(
        async (
          request: UploadAndProcessDocumentRequest,
          config: UploadAndProcessDocumentConfig
        ): Promise<ProcessDocumentResult> => {
          return await this.handleUploadAndProcessDocument(request, config);
        },
        'rag:upload-and-process-document'
      )
    );

    console.log('✅ RAG IPC handlers registered successfully');
  }

  /**
   * Удаляет все IPC обработчики для RAG системы.
   */
  removeHandlers(): void {
    console.log('🧹 Removing RAG IPC handlers...');

    ipcMain.removeHandler('rag:process-document');
    ipcMain.removeHandler('rag:query-documents');
    ipcMain.removeHandler('rag:delete-collection');
    ipcMain.removeHandler('rag:get-collection-stats');
    ipcMain.removeHandler('rag:list-collections');
    ipcMain.removeHandler('rag:upload-and-process-document');

    console.log('✅ RAG IPC handlers removed successfully');
  }

  /**
   * Создает результат ошибки для обработки документа.
   * Устраняет дублирование кода создания результатов ошибок.
   *
   * @param error - Сообщение об ошибке.
   * @returns Стандартизированный результат ошибки.
   */
  private createErrorResult(error: string): ProcessDocumentResult {
    return {
      success: false,
      chunks: [],
      totalChunks: 0,
      error,
    };
  }

  /**
   * Обрабатывает загрузку и обработку документа.
   * Извлекает текст, разбивает на чанки, создает эмбеддинги и добавляет в векторное хранилище.
   */
  private async handleProcessDocument(
    request: ProcessDocumentRequest,
    config?: UploadAndProcessDocumentConfig
  ): Promise<ProcessDocumentResult> {
    // Валидация запроса
    const validation = this.validateProcessDocumentRequest(request);
    if (!validation.valid) {
      return this.createErrorResult(validation.error || 'Invalid request');
    }

    try {
      const embeddingContext = await this.resolveEmbeddingContext(
        config?.embeddingModel
      );

      // Ленивая инициализация DocumentProcessorService
      const docProcessor = await this.getDocumentProcessorService();

      // Определяет тип файла по расширению
      const fileExtension = getFileExtension(request.filePath);

      const processingOptions = {
        ...(request.options || {}),
        chatId: request.chatId,
      };

      // Обрабатывает документ в зависимости от типа файла
      let processingResult;
      if (fileExtension === 'pdf') {
        processingResult = await docProcessor.processPDF(
          request.filePath,
          processingOptions
        );
      } else if (fileExtension === 'txt' || fileExtension === 'md') {
        processingResult = await docProcessor.processTextFile(
          request.filePath,
          processingOptions
        );
      } else {
        return this.createErrorResult(
          `Unsupported file type: ${fileExtension}`
        );
      }

      if (!processingResult.success || !processingResult.data) {
        return this.createErrorResult(
          processingResult.error ||
            `Failed to process ${fileExtension.toUpperCase()} file`
        );
      }

      // Создание чанков
      const chunkingResult = await docProcessor.splitIntoChunks(
        processingResult.data.pages,
        processingResult.data.metadata,
        request.chatId,
        processingOptions
      );

      if (!chunkingResult.success || !chunkingResult.data) {
        return this.createErrorResult(
          chunkingResult.error || 'Failed to split into chunks'
        );
      }

      // Создание коллекции если она не существует
      const collectionResult = await this.vectorStoreService.createCollection(
        request.chatId
      );

      if (!collectionResult.success) {
        console.warn(
          `Failed to create collection for chat ${request.chatId}: ${collectionResult.error}`
        );
      }

      // Генерация эмбеддингов
      const embeddingModel = embeddingContext.modelName;
      const embeddingPromises = chunkingResult.data.map(async chunk => {
        const embeddingResult = await this.embeddingService.generateEmbedding(
          chunk.content,
          embeddingModel
        );

        if (!embeddingResult.success || !embeddingResult.data) {
          console.warn(
            `Failed to generate embedding for chunk ${chunk.id}: ${embeddingResult.error}`
          );
          return chunk;
        }

        return {
          ...chunk,
          embedding: embeddingResult.data,
        };
      });

      const chunksWithEmbeddings = await Promise.all(embeddingPromises);

      // Добавление чанков в векторное хранилище
      const addResult = await this.vectorStoreService.addChunks(
        request.chatId,
        chunksWithEmbeddings
      );

      if (!addResult.success) {
        return this.createErrorResult(
          addResult.error || 'Failed to add chunks to vector store'
        );
      }

      return {
        success: true,
        chunks: chunksWithEmbeddings,
        totalChunks: chunksWithEmbeddings.length,
      };
    } catch (error) {
      const classified = this.errorHandler.classifyError(error);
      return {
        success: false,
        chunks: [],
        totalChunks: 0,
        error: classified.message,
      };
    }
  }

  /**
   * Подбирает модель эмбеддингов и проверяет совместимость с хранилищем.
   *
   * @param preferredModel - Модель, выбранная на фронтенде.
   * @returns Название модели и ожидаемая размерность векторов.
   */
  private async resolveEmbeddingContext(
    preferredModel?: string
  ): Promise<{ modelName: string; vectorSize: number }> {
    const targetModel =
      preferredModel || this.embeddingService.getCurrentEmbeddingModel();

    if (!targetModel) {
      throw new Error('Embedding model is not configured');
    }

    const isAvailable =
      await this.embeddingService.validateEmbeddingModel(targetModel);

    if (!isAvailable) {
      throw new Error(
        `Embedding model "${targetModel}" is not installed or unsupported`
      );
    }

    const vectorSize =
      this.embeddingService.getEmbeddingDimensions(targetModel);

    if (!vectorSize) {
      throw new Error(
        `Vector dimensions metadata is missing for model "${targetModel}"`
      );
    }

    await this.ensureVectorStoreCompatibility(vectorSize);
    this.embeddingService.updateConfig({ defaultModel: targetModel });

    return { modelName: targetModel, vectorSize };
  }

  /**
   * Проверяет, может ли векторное хранилище работать с новой размерностью.
   *
   * @param vectorSize - Размерность векторов выбранной модели.
   */
  private async ensureVectorStoreCompatibility(
    vectorSize: number
  ): Promise<void> {
    const currentConfig = this.vectorStoreService.getConfig();
    if (currentConfig.defaultVectorSize === vectorSize) {
      return;
    }

    const collectionsResult = await this.vectorStoreService.listCollections();
    if (!collectionsResult.success) {
      throw new Error(
        collectionsResult.error ||
          'Failed to validate existing collections before switching embedding model'
      );
    }

    const collections = collectionsResult.data || [];
    const incompatibleCollection = collections.find(
      collection =>
        collection.vectorSize !== vectorSize && collection.stats.pointsCount > 0
    );

    if (incompatibleCollection) {
      throw new Error(
        `Vector store already contains embeddings with dimension ${incompatibleCollection.vectorSize}. Remove existing collections before switching to model with dimension ${vectorSize}.`
      );
    }

    this.vectorStoreService.updateConfig({ defaultVectorSize: vectorSize });
  }

  /**
   * Обрабатывает поиск релевантных документов по запросу.
   * Выполняет векторный поиск и возвращает найденные фрагменты.
   */
  private async handleQueryDocuments(
    request: RagQueryRequest,
    config: QueryDocumentsConfig
  ): Promise<RagResponse> {
    // Валидация запроса
    const validation = this.validateRAGQueryRequest(request);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid query request');
    }

    try {
      const embeddingContext = await this.resolveEmbeddingContext(
        config.embeddingModel
      );

      // Создание RAG запроса
      const ragQuery: RagQuery = {
        query: request.query,
        chatId: request.chatId,
        topK: config.topK,
        similarityThreshold: config.similarityThreshold,
      };

      // Генерирует эмбеддинг для запроса пользователя
      console.log('🔍 Generating embedding for query:', request.query);
      const embeddingResult = await this.embeddingService.generateEmbedding(
        request.query,
        embeddingContext.modelName
      );

      if (!embeddingResult.success || !embeddingResult.data) {
        console.warn(
          '⚠️ Failed to generate query embedding:',
          embeddingResult.error
        );
        // Продолжает без эмбеддинга (будет использован fallback)
      }

      const queryEmbedding = embeddingResult.data;

      // Выполнение поиска в векторном хранилище с эмбеддингом запроса
      const searchResult = await this.vectorStoreService.query(
        ragQuery,
        queryEmbedding
      );

      if (!searchResult.success || !searchResult.data) {
        throw new Error(searchResult.error || 'Failed to query documents');
      }

      return searchResult.data;
    } catch (error) {
      const classified = this.errorHandler.classifyError(error);
      throw new Error(classified.message);
    }
  }

  /**
   * Обрабатывает удаление коллекции документов.
   * Удаляет коллекцию для конкретного чата.
   */
  private async handleDeleteCollection(
    request: DeleteCollectionRequest
  ): Promise<DeleteCollectionResult> {
    // Валидация запроса
    const validation = this.validateDeleteCollectionRequest(request);
    if (!validation.valid) {
      return {
        success: false,
        deletedChatId: request.chatId,
        error: validation.error,
      };
    }

    try {
      // Удаление коллекции из векторного хранилища
      const deleteResult = await this.vectorStoreService.deleteCollection(
        request.chatId
      );

      if (!deleteResult.success) {
        return {
          success: false,
          deletedChatId: request.chatId,
          error: deleteResult.error || 'Failed to delete collection',
        };
      }

      return {
        success: true,
        deletedChatId: request.chatId,
      };
    } catch (error) {
      const classified = this.errorHandler.classifyError(error);
      return {
        success: false,
        deletedChatId: request.chatId,
        error: classified.message,
      };
    }
  }

  /**
   * Обрабатывает получение статистики коллекции.
   * Возвращает информацию о количестве документов и размере коллекции.
   */
  private async handleGetCollectionStats(request: {
    chatId: string;
  }): Promise<CollectionStats> {
    try {
      // Получение статистики коллекции
      const statsResult = await this.vectorStoreService.getCollectionStats(
        request.chatId
      );

      if (!statsResult.success || !statsResult.data) {
        throw new Error(statsResult.error || 'Failed to get collection stats');
      }

      return statsResult.data;
    } catch (error) {
      const classified = this.errorHandler.classifyError(error);
      throw new Error(classified.message);
    }
  }

  /**
   * Обрабатывает получение списка всех коллекций.
   * Возвращает информацию о всех коллекциях в векторном хранилище.
   */
  private async handleListCollections(): Promise<VectorCollection[]> {
    try {
      // Получение списка всех коллекций
      const result = await this.vectorStoreService.listCollections();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to list collections');
      }

      return result.data;
    } catch (error) {
      const classified = this.errorHandler.classifyError(error);
      throw new Error(classified.message);
    }
  }

  /**
   * Валидация запроса обработки документа.
   */
  private validateProcessDocumentRequest(request: ProcessDocumentRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.filePath) {
      return { valid: false, error: 'File path is required' };
    }

    if (!request.chatId) {
      return { valid: false, error: 'Chat ID is required' };
    }

    return { valid: true };
  }

  /**
   * Валидация запроса поиска документов.
   */
  private validateRAGQueryRequest(request: RagQueryRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.query || request.query.trim() === '') {
      return { valid: false, error: 'Query text is required' };
    }

    if (!request.chatId) {
      return { valid: false, error: 'Chat ID is required' };
    }

    return { valid: true };
  }

  /**
   * Обрабатывает загрузку и обработку документа из React.
   * Сохраняет файл во временную директорию и вызывает обработку.
   */
  private async handleUploadAndProcessDocument(
    request: UploadAndProcessDocumentRequest,
    config: UploadAndProcessDocumentConfig
  ): Promise<ProcessDocumentResult> {
    // Валидация запроса
    const validation = this.validateUploadAndProcessRequest(request);
    if (!validation.valid) {
      return this.createErrorResult(validation.error || 'Invalid request');
    }

    let tempFilePath: string | null = null;

    try {
      // Декодируем base64 данные
      const buffer = Buffer.from(request.fileData, 'base64');

      // Сохраняем во временную директорию
      const tempDir = os.tmpdir();
      tempFilePath = path.join(
        tempDir,
        `rag_${request.chatId}_${Date.now()}_${request.fileName}`
      );

      fs.writeFileSync(tempFilePath, buffer);
      console.log(`📄 Файл сохранен: ${tempFilePath}`);

      // Передача chunkSize сохраняет консистентность настроек RAG и обработки документов
      const result = await this.handleProcessDocument(
        {
          filePath: tempFilePath,
          chatId: request.chatId,
          options: {
            chunkSize: config.chunkSize,
          },
        },
        config
      );

      return result;
    } catch (error) {
      const classified = this.errorHandler.classifyError(error);
      return this.createErrorResult(classified.message);
    } finally {
      // Удаляет временный файл
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`🗑️ Временный файл удален: ${tempFilePath}`);
        } catch {
          console.warn(`⚠️ Не удалось удалить временный файл: ${tempFilePath}`);
        }
      }
    }
  }

  /**
   * Валидация запроса удаления коллекции.
   */
  private validateDeleteCollectionRequest(request: DeleteCollectionRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.chatId) {
      return { valid: false, error: 'Chat ID is required' };
    }

    return { valid: true };
  }

  /**
   * Валидация запроса загрузки и обработки документа.
   */
  private validateUploadAndProcessRequest(
    request: UploadAndProcessDocumentRequest
  ): { valid: boolean; error?: string } {
    if (!request.fileName) {
      return { valid: false, error: 'File name is required' };
    }

    if (!request.fileData) {
      return { valid: false, error: 'File data is required' };
    }

    if (!request.chatId) {
      return { valid: false, error: 'Chat ID is required' };
    }

    const fileName = request.fileName.toLowerCase();
    const supportedExtensions = ['.pdf', '.txt', '.md'];
    const isSupported = supportedExtensions.some(ext => fileName.endsWith(ext));

    if (!isSupported) {
      return {
        valid: false,
        error: 'Only PDF, TXT, and MD files are supported',
      };
    }

    return { valid: true };
  }
}

/**
 * Фабричная функция для создания RAG обработчиков.
 *
 * @param vectorStoreService - Сервис для работы с векторным хранилищем.
 * @param documentProcessorService - Сервис для обработки документов.
 * @param embeddingService - Сервис для генерации эмбеддингов.
 * @returns Экземпляр RagHandlers.
 */
export function createRagHandlers(
  vectorStoreService: VectorStoreService,
  documentProcessorService: DocumentProcessorService,
  embeddingService: EmbeddingService
): RagHandlers {
  return new RagHandlers(
    vectorStoreService,
    documentProcessorService,
    embeddingService
  );
}
