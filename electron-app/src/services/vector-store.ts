/**
 * @module VectorStoreService
 * Сервис для управления векторными эмбеддингами с использованием Qdrant.
 * Обеспечивает CRUD операции с векторными коллекциями и поиск по документам.
 */

import * as crypto from 'crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import {
  DocumentChunk,
  VectorCollection,
  CollectionStats,
  VectorStoreConfig,
  VectorStoreResult,
  CachedCollection,
  VectorStoreOptions,
  RAGQuery,
  RAGResponse,
  DocumentSource,
  DistanceMetric,
} from '../types/rag';

/**
 * Сервис векторного хранилища на основе Qdrant.
 * Управляет коллекциями векторов для RAG системы с поддержкой кэширования и оптимизации.
 */
export class VectorStoreService {
  private config: VectorStoreConfig;
  private qdrantClient: QdrantClient;
  private collectionCache: Map<string, CachedCollection> = new Map();
  private isInitialized: boolean = false;

  constructor(config?: Partial<VectorStoreConfig>) {
    this.config = {
      defaultVectorSize: 768, // Размерность для nomic-embed-text
      defaultDistanceMetric: 'cosine',
      defaultIndexParams: {
        indexType: 'hnsw',
        hnswConfig: {
          m: 16,
          efConstruct: 200,
          efSearch: 50,
          fullScanThreshold: 10000,
        },
      },
      collectionCacheTimeout: 30 * 60 * 1000, // 30 минут
      maxCachedCollections: 100,
      ...config,
    };

    // Инициализирует Qdrant клиент
    this.qdrantClient = new QdrantClient({
      url: 'http://127.0.0.1:6333',
      timeout: 30000,
    });
  }

  /**
   * Создает успешный результат VectorStoreResult.
   */
  private createSuccessResult<T>(
    data: T,
    status:
      | 'success'
      | 'idle'
      | 'initializing'
      | 'creating'
      | 'indexing'
      | 'searching'
      | 'updating'
      | 'deleting' = 'success'
  ): VectorStoreResult<T> {
    return {
      success: true,
      data,
      status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Создает результат ошибки VectorStoreResult.
   */
  private createErrorResult<T>(
    error: string,
    status: 'error' = 'error'
  ): VectorStoreResult<T> {
    return {
      success: false,
      error,
      status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Инициализирует сервис векторного хранилища.
   * Проверяет доступность Qdrant и настраивает соединение.
   */
  async initialize(): Promise<VectorStoreResult<void>> {
    try {
      console.log('🔧 VectorStoreService: Initializing Qdrant connection...');

      // Проверяет доступность Qdrant сервера
      await this.qdrantClient.getCollections();
      console.log('✅ Qdrant server is available');

      this.isInitialized = true;
      console.log('✅ VectorStoreService initialized successfully');

      return this.createSuccessResult(undefined, 'success');
    } catch (error) {
      console.error('❌ Failed to initialize VectorStoreService:', error);
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Создает коллекцию для конкретного чата.
   * Генерирует уникальное имя коллекции и настраивает параметры Qdrant.
   */
  async createCollection(
    chatId: string,
    _options: VectorStoreOptions = {}
  ): Promise<VectorStoreResult<VectorCollection>> {
    try {
      if (!this.isInitialized) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collectionName = this.generateCollectionName(chatId);
      console.log(
        `🔧 VectorStoreService: Creating collection '${collectionName}'...`
      );

      // Проверяет, существует ли коллекция
      try {
        const existingCollection =
          await this.qdrantClient.getCollection(collectionName);
        console.log(`⚠️ Collection '${collectionName}' already exists`);

        // Возвращает информацию о существующей коллекции
        const collection: VectorCollection = {
          name: collectionName,
          chatId,
          vectorSize: this.config.defaultVectorSize,
          distanceMetric: this.config.defaultDistanceMetric,
          indexParams: this.config.defaultIndexParams,
          stats: {
            pointsCount: existingCollection.points_count || 0,
            sizeBytes: existingCollection.vectors_count || 0,
            indexesCount: 1,
            indexingStatus: 'completed',
            lastIndexedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.cacheCollection(collection);
        return this.createSuccessResult(collection, 'success');
      } catch {
        // Коллекция не существует, создает новую
      }

      // Создает новую коллекцию
      await this.qdrantClient.createCollection(collectionName, {
        vectors: {
          size: this.config.defaultVectorSize,
          distance: this.mapDistanceMetric(this.config.defaultDistanceMetric),
        } as any,
        hnsw_config: {
          m: this.config.defaultIndexParams.hnswConfig?.m || 16,
          ef_construct:
            this.config.defaultIndexParams.hnswConfig?.efConstruct || 200,
          full_scan_threshold:
            this.config.defaultIndexParams.hnswConfig?.fullScanThreshold ||
            10000,
        },
      });

      console.log(`✅ Collection '${collectionName}' created successfully`);

      // Создает объект коллекции
      const collection: VectorCollection = {
        name: collectionName,
        chatId,
        vectorSize: this.config.defaultVectorSize,
        distanceMetric: this.config.defaultDistanceMetric,
        indexParams: this.config.defaultIndexParams,
        stats: {
          pointsCount: 0,
          sizeBytes: 0,
          indexesCount: 1,
          indexingStatus: 'completed',
          lastIndexedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.cacheCollection(collection);
      return this.createSuccessResult(collection, 'success');
    } catch (error) {
      console.error(
        `❌ Failed to create collection for chat ${chatId}:`,
        error
      );
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Добавляет чанки документов в коллекцию.
   * Конвертирует DocumentChunk в формат Qdrant и выполняет upsert.
   */
  async addChunks(
    chatId: string,
    chunks: DocumentChunk[],
    _options: VectorStoreOptions = {}
  ): Promise<VectorStoreResult<number>> {
    try {
      if (!this.isInitialized) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collectionName = this.generateCollectionName(chatId);
      console.log(
        `🔧 VectorStoreService: Adding ${chunks.length} chunks to collection '${collectionName}'...`
      );

      // Конвертирует чанки в формат Qdrant
      const points = chunks.map((chunk, index) => ({
        id: chunk.id || `${chatId}_${index}`,
        vector: chunk.embedding || [],
        payload: {
          content: chunk.content,
          metadata: chunk.metadata,
          createdAt: chunk.createdAt,
          updatedAt: chunk.updatedAt,
        },
      }));

      // Выполняет upsert в Qdrant
      await this.qdrantClient.upsert(collectionName, {
        wait: true,
        points,
      });

      console.log(
        `✅ Successfully added ${chunks.length} chunks to collection '${collectionName}'`
      );

      // Обновляет кэш коллекции
      const cachedCollection = this.collectionCache.get(collectionName);
      if (cachedCollection) {
        cachedCollection.collection.stats.pointsCount += chunks.length;
        cachedCollection.collection.updatedAt = new Date().toISOString();
      }

      return this.createSuccessResult(chunks.length, 'success');
    } catch (error) {
      console.error(
        `❌ Failed to add chunks to collection for chat ${chatId}:`,
        error
      );
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Выполняет поиск релевантных чанков по текстовому запросу.
   * Использует векторный поиск в Qdrant с фильтрацией по метаданным.
   */
  async query(
    query: RAGQuery,
    _options: VectorStoreOptions = {}
  ): Promise<VectorStoreResult<RAGResponse>> {
    try {
      if (!this.isInitialized) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collectionName = this.generateCollectionName(query.chatId);
      console.log(
        `🔧 VectorStoreService: Searching in collection '${collectionName}'...`
      );

      // Создает фильтры для поиска
      const mustFilters: Array<Record<string, unknown>> = [
        {
          key: 'metadata.chatId',
          match: { value: query.chatId },
        },
      ];

      if (query.filters?.source) {
        mustFilters.push({
          key: 'metadata.source',
          match: { value: query.filters.source },
        });
      }

      if (query.filters?.pageNumber !== undefined) {
        mustFilters.push({
          key: 'metadata.pageNumber',
          match: { value: query.filters.pageNumber },
        });
      }

      // Выполняет поиск в Qdrant
      const searchResult = await this.qdrantClient.search(collectionName, {
        vector: [], // NOTE: Здесь должен быть вектор запроса, но пока используем пустой
        limit: query.topK || 10,
        score_threshold: query.similarityThreshold || 0.7,
        with_payload: true,
        filter: {
          must: mustFilters,
        },
      });

      // Конвертирует результаты в формат RAGResponse
      const sources: DocumentSource[] = searchResult.map(hit => {
        const payload = hit.payload as Record<string, unknown> | undefined;
        const metadata = payload?.['metadata'] as
          | Record<string, unknown>
          | undefined;
        return {
          chunkId: hit.id as string,
          content: (payload?.['content'] as string) || '',
          relevance: hit.score || 0,
          metadata: {
            source: (metadata?.['source'] as string) || '',
            pageNumber: (metadata?.['pageNumber'] as number) || 0,
            chunkIndex: (metadata?.['chunkIndex'] as number) || 0,
          },
        };
      });

      const response: RAGResponse = {
        answer: '', // Будет заполнено в feature-provider
        sources,
        confidence: sources.length > 0 ? sources[0]?.relevance || 0 : 0,
        searchMetadata: {
          searchTime: 0, // Будет заполнено в feature-provider
          chunksFound: sources.length,
          averageSimilarity:
            sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length,
          distanceMetric: this.config.defaultDistanceMetric,
        },
        timestamp: new Date().toISOString(),
      };

      console.log(`✅ Found ${sources.length} relevant chunks`);

      return this.createSuccessResult(response, 'success');
    } catch (error) {
      console.error(
        `❌ Failed to search in collection for chat ${query.chatId}:`,
        error
      );
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Удаляет коллекцию при удалении чата.
   * Очищает все данные и освобождает ресурсы.
   */
  async deleteCollection(
    chatId: string,
    _options: VectorStoreOptions = {}
  ): Promise<VectorStoreResult<void>> {
    try {
      if (!this.isInitialized) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collectionName = this.generateCollectionName(chatId);
      console.log(
        `🔧 VectorStoreService: Deleting collection '${collectionName}'...`
      );

      // Удаляет коллекцию из Qdrant
      await this.qdrantClient.deleteCollection(collectionName);

      // Удаляет из кэша
      this.collectionCache.delete(collectionName);

      console.log(`✅ Collection '${collectionName}' deleted successfully`);

      return this.createSuccessResult(undefined, 'success');
    } catch (error) {
      console.error(
        `❌ Failed to delete collection for chat ${chatId}:`,
        error
      );
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Получает статистику по коллекции.
   * Возвращает информацию о количестве точек, размере и индексах.
   */
  async getCollectionStats(
    chatId: string,
    _options: VectorStoreOptions = {}
  ): Promise<VectorStoreResult<CollectionStats>> {
    try {
      if (!this.isInitialized) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collectionName = this.generateCollectionName(chatId);
      console.log(
        `🔧 VectorStoreService: Getting stats for collection '${collectionName}'...`
      );

      // Получает информацию о коллекции из Qdrant
      const collectionInfo =
        await this.qdrantClient.getCollection(collectionName);

      const stats: CollectionStats = {
        pointsCount: collectionInfo.points_count || 0,
        sizeBytes: collectionInfo.vectors_count || 0,
        indexesCount: 1,
        indexingStatus: 'completed',
        lastIndexedAt: new Date().toISOString(),
      };

      console.log(
        `✅ Collection stats: ${stats.pointsCount} points, ${stats.sizeBytes} bytes`
      );

      return this.createSuccessResult(stats, 'success');
    } catch (error) {
      console.error(
        `❌ Failed to get collection stats for chat ${chatId}:`,
        error
      );
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Генерирует уникальное имя коллекции для чата.
   * Использует crypto для создания детерминированного имени.
   */
  private generateCollectionName(chatId: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(chatId)
      .digest('hex')
      .substring(0, 16);
    return `chat_${hash}`;
  }

  /**
   * Кэширует коллекцию для оптимизации производительности.
   */
  private cacheCollection(collection: VectorCollection): void {
    const cachedCollection: CachedCollection = {
      collection,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.config.collectionCacheTimeout,
      accessCount: 1,
      lastAccessedAt: Date.now(),
    };

    this.collectionCache.set(collection.name, cachedCollection);

    // Очищает старые записи из кэша
    if (this.collectionCache.size > this.config.maxCachedCollections) {
      const entries = Array.from(this.collectionCache.entries());
      const oldestEntry = entries.sort(
        ([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt
      )[0];
      if (oldestEntry) {
        this.collectionCache.delete(oldestEntry[0]);
      }
    }
  }

  /**
   * Очищает ресурсы при завершении работы приложения.
   */
  async cleanup(): Promise<void> {
    console.log('🧹 VectorStoreService: Cleaning up resources...');

    this.collectionCache.clear();
    this.isInitialized = false;

    console.log('✅ VectorStoreService cleanup completed');
  }

  /**
   * Получает текущую конфигурацию сервиса.
   */
  getConfig(): VectorStoreConfig {
    return { ...this.config };
  }

  /**
   * Обновляет конфигурацию сервиса.
   */
  updateConfig(newConfig: Partial<VectorStoreConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Проверяет, инициализирован ли сервис.
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Маппинг метрик расстояния для Qdrant.
   */
  private mapDistanceMetric(metric: DistanceMetric): string {
    switch (metric) {
      case 'cosine':
        return 'Cosine';
      case 'euclidean':
        return 'Euclid';
      case 'dot':
        return 'Dot';
      default:
        return 'Cosine';
    }
  }
}

/**
 * Создает экземпляр VectorStoreService.
 */
export function createVectorStoreService(
  config?: Partial<VectorStoreConfig>
): VectorStoreService {
  return new VectorStoreService(config);
}
