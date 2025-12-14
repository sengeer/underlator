/**
 * @module VectorStoreService (SQLite Implementation)
 * Сервис для управления векторными эмбеддингами с использованием SQLite.
 * Полностью локальное решение без внешних зависимостей.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import Database from 'better-sqlite3';
import {
  DocumentChunk,
  VectorCollection,
  CollectionStats,
  VectorStoreConfig,
  VectorStoreResult,
  CachedCollection,
  VectorStoreOptions,
  RagQuery,
  RagResponse,
  DocumentSource,
  DistanceMetric,
} from '../types/rag';
import type { ChunkRow, StatsRow, CollectionRow } from '../types/vector-store';

/**
 * Сервис векторного хранилища на основе SQLite.
 * Управляет коллекциями векторов для RAG системы без внешних зависимостей.
 */
export class VectorStoreService {
  private config: VectorStoreConfig;
  private db: Database.Database | null = null;
  private dbPath: string;
  private collectionCache: Map<string, CachedCollection> = new Map();
  private isInitialized: boolean = false;

  constructor(config?: Partial<VectorStoreConfig>) {
    this.config = {
      defaultVectorSize: 768, // Размерность для embeddinggemma
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

    // Определяет путь к базе данных
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'Rag Vectors');

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = path.join(dbDir, 'vectors.db');
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
   * Создает SQLite базу данных и необходимые таблицы.
   */
  async initialize(): Promise<VectorStoreResult<void>> {
    try {
      console.log('🔧 VectorStoreService: Initializing SQLite database...');

      // Создает SQLite базу данных
      this.db = new Database(this.dbPath);

      // Включает WAL режим для лучшей производительности
      this.db.pragma('journal_mode = WAL');

      // Создает таблицу для чанков
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS chunks (
          id TEXT PRIMARY KEY,
          collection_name TEXT NOT NULL,
          chat_id TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding TEXT NOT NULL,
          metadata TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Создает индексы для быстрого поиска
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_collection ON chunks(collection_name);
        CREATE INDEX IF NOT EXISTS idx_chat_id ON chunks(chat_id);
      `);

      // Создает таблицу для коллекций
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS collections (
          name TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          vector_size INTEGER NOT NULL,
          distance_metric TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      this.isInitialized = true;
      console.log('✅ VectorStoreService initialized successfully');
      console.log(`📁 Database location: ${this.dbPath}`);

      return this.createSuccessResult(undefined, 'success');
    } catch (error) {
      console.error('Failed to initialize VectorStoreService:', error);
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Создает коллекцию для конкретного чата.
   */
  async createCollection(
    chatId: string,
    _options: VectorStoreOptions = {}
  ): Promise<VectorStoreResult<VectorCollection>> {
    try {
      if (!this.isInitialized || !this.db) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collectionName = this.generateCollectionName(chatId);
      console.log(
        `🔧 VectorStoreService: Creating collection '${collectionName}'...`
      );

      // Проверяет, существует ли коллекция
      const existing = this.db
        .prepare('SELECT * FROM collections WHERE name = ?')
        .get(collectionName);

      if (existing) {
        console.log(`⚠️ Collection '${collectionName}' already exists`);

        const stats = await this.getCollectionStats(chatId);
        const defaultStats: CollectionStats = {
          pointsCount: 0,
          sizeBytes: 0,
          indexesCount: 1,
          indexingStatus: 'completed',
          lastIndexedAt: new Date().toISOString(),
        };

        const collection: VectorCollection = {
          name: collectionName,
          chatId,
          vectorSize: this.config.defaultVectorSize,
          distanceMetric: this.config.defaultDistanceMetric,
          indexParams: this.config.defaultIndexParams,
          stats: stats.success && stats.data ? stats.data : defaultStats,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.cacheCollection(collection);
        return this.createSuccessResult(collection, 'success');
      }

      // Создает новую коллекцию
      this.db
        .prepare(
          'INSERT INTO collections (name, chat_id, vector_size, distance_metric, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          collectionName,
          chatId,
          this.config.defaultVectorSize,
          this.config.defaultDistanceMetric,
          new Date().toISOString(),
          new Date().toISOString()
        );

      console.log(`✅ Collection '${collectionName}' created successfully`);

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
      console.error(`Failed to create collection for chat ${chatId}:`, error);
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Добавляет чанки документов в коллекцию.
   */
  async addChunks(
    chatId: string,
    chunks: DocumentChunk[],
    _options: VectorStoreOptions = {}
  ): Promise<VectorStoreResult<number>> {
    try {
      if (!this.isInitialized || !this.db) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collectionName = this.generateCollectionName(chatId);
      console.log(
        `🔧 VectorStoreService: Adding ${chunks.length} chunks to collection '${collectionName}'...`
      );

      const insert = this.db.prepare(`
        INSERT INTO chunks (id, collection_name, chat_id, content, embedding, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = this.db.transaction((chunks: DocumentChunk[]) => {
        let count = 0;
        for (const chunk of chunks) {
          // Проверяет что content это строка
          const contentStr =
            typeof chunk.content === 'string'
              ? chunk.content
              : String(chunk.content);

          insert.run(
            chunk.id || `${chatId}_${chunk.metadata?.chunkIndex || count}`,
            collectionName,
            chatId,
            contentStr,
            JSON.stringify(chunk.embedding || []),
            JSON.stringify(chunk.metadata || {}),
            chunk.createdAt || new Date().toISOString(),
            chunk.updatedAt || new Date().toISOString()
          );
          count++;
        }
        return count;
      });

      const count = insertMany(chunks);

      console.log(
        `✅ Successfully added ${count} chunks to collection '${collectionName}'`
      );

      return this.createSuccessResult(count, 'success');
    } catch (error) {
      console.error(
        `Failed to add chunks to collection for chat ${chatId}:`,
        error
      );
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Выполняет поиск релевантных чанков по текстовому запросу.
   * Использует косинусное расстояние для расчета схожести.
   *
   * @param query - Параметры запроса
   * @param queryEmbedding - Эмбеддинг запроса для семантического поиска
   * @param _options - Опции выполнения запроса
   */
  async query(
    query: RagQuery,
    queryEmbedding?: number[],
    _options: VectorStoreOptions = {}
  ): Promise<VectorStoreResult<RagResponse>> {
    try {
      if (!this.isInitialized || !this.db) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collectionName = this.generateCollectionName(query.chatId);
      console.log(
        `🔧 VectorStoreService: Searching in collection '${collectionName}'...`
      );

      // Получает все чанки из коллекции
      const chunks = this.db
        .prepare(
          'SELECT * FROM chunks WHERE collection_name = ? AND chat_id = ?'
        )
        .all(collectionName, query.chatId);

      console.log(`📊 Found ${chunks.length} chunks in collection`);

      if (chunks.length > 0 && chunks[0]) {
        const firstChunk = chunks[0] as ChunkRow;
        console.log(`📝 First chunk content type:`, typeof firstChunk.content);
        console.log(
          `📝 First chunk content preview:`,
          String(firstChunk.content || '').substring(0, 200)
        );
      }

      // Если есть эмбеддинг запроса - использует семантический поиск
      let sources: DocumentSource[];
      if (queryEmbedding && queryEmbedding.length > 0) {
        console.log('🔍 Using semantic search with embeddings');

        // Вычисляет косинусное расстояние для каждого чанка
        const chunksWithSimilarity = (chunks as ChunkRow[]).map(chunk => {
          const metadata = JSON.parse(chunk.metadata || '{}');
          const chunkEmbedding: number[] = JSON.parse(chunk.embedding || '[]');

          // Вычисляет косинусное расстояние (cosine similarity)
          const similarity = this.cosineSimilarity(
            queryEmbedding,
            chunkEmbedding
          );

          let content = '';
          if (typeof chunk.content === 'string') {
            content = chunk.content;
          } else {
            content = String(chunk.content || '');
          }

          // Гибридный поиск: применение бонуса за точное совпадение ключевых слов из запроса
          let boostedSimilarity = similarity;
          const queryLower = query.query.toLowerCase();
          const contentLower = content.toLowerCase();

          // Ищет точные совпадения в тексте (особенно для пунктов типа "7.1", "III" и т.д.)
          if (contentLower.includes(queryLower)) {
            boostedSimilarity += 0.3; // Бонус за точное совпадение
          }

          // Бонус за точное совпадение номеров пунктов (например, "7.1")
          const pointRegex = /\d+\.\d+/g;
          const matches = query.query.match(pointRegex);
          if (matches) {
            matches.forEach(match => {
              if (contentLower.includes(match.toLowerCase())) {
                boostedSimilarity += 0.2; // Дополнительный бонус за номер пункта
              }
            });
          }

          return {
            chunk,
            similarity: Math.min(boostedSimilarity, 1.0), // Ограничиваем максимум
            content,
            metadata,
          };
        });

        // Сортирует по релевантности (от наибольшего к наименьшему)
        chunksWithSimilarity.sort((a, b) => b.similarity - a.similarity);

        // Фильтрует по порогу схожести
        const threshold = query.similarityThreshold ?? 0.7;
        const filteredChunks = chunksWithSimilarity.filter(
          item => item.similarity >= threshold
        );

        // Если ничего не прошло порог — берём topK лучших по сходству
        const effectiveChunks =
          filteredChunks.length > 0
            ? filteredChunks
            : chunksWithSimilarity.slice(0, query.topK || 5);

        console.log(
          `✅ Relevant chunks: ${effectiveChunks.length} (filtered=${filteredChunks.length}, threshold=${threshold})`
        );

        // Формирует источники
        sources = effectiveChunks.map(item => ({
          chunkId: item.chunk.id,
          content: item.content,
          relevance: item.similarity,
          metadata: {
            source: item.metadata.source || '',
            pageNumber: item.metadata.pageNumber || 0,
            chunkIndex: item.metadata.chunkIndex || 0,
          },
        }));
      } else {
        // Fallback: если нет эмбеддинга, возвращает все чанки
        console.log('⚠️ No query embedding provided, using simple search');
        sources = (chunks as ChunkRow[]).map((chunk, index) => {
          const metadata = JSON.parse(chunk.metadata || '{}');

          let content = '';
          if (typeof chunk.content === 'string') {
            content = chunk.content;
          } else {
            content = String(chunk.content || '');
          }

          return {
            chunkId: chunk.id,
            content: content,
            relevance: 1.0 - index * 0.1,
            metadata: {
              source: metadata.source || '',
              pageNumber: metadata.pageNumber || 0,
              chunkIndex: metadata.chunkIndex || index,
            },
          };
        });
      }

      // Ограничивает результаты
      const limitedSources = sources.slice(0, query.topK || 10);

      const response: RagResponse = {
        answer: '',
        sources: limitedSources,
        confidence:
          limitedSources.length > 0 ? limitedSources[0]?.relevance || 0 : 0,
        searchMetadata: {
          searchTime: 0,
          chunksFound: limitedSources.length,
          averageSimilarity:
            limitedSources.reduce((sum, s) => sum + s.relevance, 0) /
            limitedSources.length,
          distanceMetric: this.config.defaultDistanceMetric,
        },
        timestamp: new Date().toISOString(),
      };

      console.log(`✅ Found ${limitedSources.length} relevant chunks`);

      return this.createSuccessResult(response, 'success');
    } catch (error) {
      console.error(
        `Failed to search in collection for chat ${query.chatId}:`,
        error
      );
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Вычисляет косинусное сходство между двумя векторами.
   * @param vec1 - Первый вектор
   * @param vec2 - Второй вектор
   * @returns Косинусное сходство (0-1)
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      console.warn('⚠️ Vector dimensions mismatch:', vec1.length, vec2.length);
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      const v1 = vec1[i] ?? 0;
      const v2 = vec2[i] ?? 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * Удаляет коллекцию при удалении чата.
   */
  async deleteCollection(
    chatId: string,
    _options: VectorStoreOptions = {}
  ): Promise<VectorStoreResult<void>> {
    try {
      if (!this.isInitialized || !this.db) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collectionName = this.generateCollectionName(chatId);
      console.log(
        `🔧 VectorStoreService: Deleting collection '${collectionName}'...`
      );

      // Удаляет чанки
      this.db
        .prepare('DELETE FROM chunks WHERE collection_name = ?')
        .run(collectionName);

      // Удаляет коллекцию
      this.db
        .prepare('DELETE FROM collections WHERE name = ?')
        .run(collectionName);

      // Удаляет из кэша
      this.collectionCache.delete(collectionName);

      console.log(`✅ Collection '${collectionName}' deleted successfully`);

      return this.createSuccessResult(undefined, 'success');
    } catch (error) {
      console.error(`Failed to delete collection for chat ${chatId}:`, error);
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Получает статистику по коллекции.
   */
  async getCollectionStats(
    chatId: string,
    _options: VectorStoreOptions = {}
  ): Promise<VectorStoreResult<CollectionStats>> {
    try {
      if (!this.isInitialized || !this.db) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collectionName = this.generateCollectionName(chatId);
      console.log(
        `🔧 VectorStoreService: Getting stats for collection '${collectionName}'...`
      );

      const stats = this.db
        .prepare(
          'SELECT COUNT(*) as count, SUM(LENGTH(embedding)) as size FROM chunks WHERE collection_name = ?'
        )
        .get(collectionName) as StatsRow;

      const statsObj: CollectionStats = {
        pointsCount: stats?.count || 0,
        sizeBytes: stats?.size || 0,
        indexesCount: 1,
        indexingStatus: 'completed',
        lastIndexedAt: new Date().toISOString(),
      };

      console.log(
        `✅ Collection stats: ${statsObj.pointsCount} points, ${statsObj.sizeBytes} bytes`
      );

      return this.createSuccessResult(statsObj, 'success');
    } catch (error) {
      console.error(
        `Failed to get collection stats for chat ${chatId}:`,
        error
      );
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Получает список всех коллекций.
   */
  async listCollections(): Promise<VectorStoreResult<VectorCollection[]>> {
    try {
      if (!this.isInitialized || !this.db) {
        throw new Error('VectorStoreService is not initialized');
      }

      const collections = this.db
        .prepare('SELECT * FROM collections')
        .all() as CollectionRow[];

      const result: VectorCollection[] = collections.map(col => {
        return {
          name: col.name,
          chatId: col.chat_id,
          vectorSize: col.vector_size,
          distanceMetric: col.distance_metric as DistanceMetric,
          indexParams: this.config.defaultIndexParams,
          stats: {
            pointsCount: 0,
            sizeBytes: 0,
            indexesCount: 1,
            indexingStatus: 'completed',
            lastIndexedAt: new Date().toISOString(),
          },
          createdAt: col.created_at,
          updatedAt: col.updated_at,
        };
      });

      return this.createSuccessResult(result, 'success');
    } catch (error) {
      console.error('Failed to list collections:', error);
      return this.createErrorResult((error as Error).message);
    }
  }

  /**
   * Генерирует уникальное имя коллекции для чата.
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

    if (this.db) {
      this.db.close();
      this.db = null;
    }

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
}

/**
 * Создает экземпляр VectorStoreService.
 */
export function createVectorStoreService(
  config?: Partial<VectorStoreConfig>
): VectorStoreService {
  return new VectorStoreService(config);
}
