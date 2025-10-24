/**
 * @module RAGTypes
 * Типы для системы RAG (Retrieval-Augmented Generation).
 * Определяет интерфейсы для работы с векторным хранилищем, обработки документов и поиска.
 */

/**
 * Чанк документа для векторного хранилища.
 * Представляет фрагмент текста с метаданными и эмбеддингами.
 */
export interface DocumentChunk {
  /** Уникальный идентификатор чанка */
  id: string;
  /** Содержимое текста чанка */
  content: string;
  /** Метаданные чанка */
  metadata: {
    /** Источник документа (путь к файлу) */
    source: string;
    /** Номер страницы в документе */
    pageNumber: number;
    /** Индекс чанка в документе */
    chunkIndex: number;
    /** Идентификатор чата */
    chatId: string;
  };
  /** Векторные эмбеддинги чанка */
  embedding?: number[];
  /** Временная метка создания */
  createdAt: string;
  /** Временная метка обновления */
  updatedAt: string;
}

/**
 * Запрос для поиска в векторном хранилище.
 * Определяет параметры поиска релевантных документов.
 */
export interface RAGQuery {
  /** Текст запроса для поиска */
  query: string;
  /** Идентификатор чата для фильтрации */
  chatId: string;
  /** Количество возвращаемых результатов */
  topK?: number;
  /** Порог схожести (0.0 - 1.0) */
  similarityThreshold?: number;
  /** Фильтры по метаданным */
  filters?: {
    /** Фильтр по источнику документа */
    source?: string;
    /** Фильтр по номеру страницы */
    pageNumber?: number;
    /** Дополнительные фильтры */
    additional?: Record<string, unknown>;
  };
  /** Параметры поиска */
  searchParams?: {
    /** Метрика расстояния для поиска */
    distanceMetric?: DistanceMetric;
    /** Параметры индексации */
    indexParams?: IndexParams;
  };
}

/**
 * Ответ RAG системы.
 * Содержит результаты поиска и контекстную информацию.
 */
export interface RAGResponse {
  /** Ответ модели на основе найденных документов */
  answer: string;
  /** Массив источников документов */
  sources: DocumentSource[];
  /** Уровень уверенности в ответе (0.0 - 1.0) */
  confidence: number;
  /** Метаданные поиска */
  searchMetadata: {
    /** Время выполнения поиска в миллисекундах */
    searchTime: number;
    /** Количество найденных чанков */
    chunksFound: number;
    /** Средняя схожесть найденных чанков */
    averageSimilarity: number;
    /** Использованная метрика расстояния */
    distanceMetric: DistanceMetric;
  };
  /** Временная метка ответа */
  timestamp: string;
}

/**
 * Источник документа в ответе RAG.
 * Представляет найденный релевантный фрагмент документа.
 */
export interface DocumentSource {
  /** Идентификатор чанка */
  chunkId: string;
  /** Содержимое чанка */
  content: string;
  /** Уровень релевантности (0.0 - 1.0) */
  relevance: number;
  /** Метаданные источника */
  metadata: {
    /** Источник документа */
    source: string;
    /** Номер страницы */
    pageNumber: number;
    /** Индекс чанка */
    chunkIndex: number;
  };
}

// Типы для обработки документов удалены как неиспользуемые в текущей реализации
// Они будут добавлены в следующих этапах при реализации DocumentProcessorService

/**
 * Коллекция в векторном хранилище.
 * Представляет именованную коллекцию векторов для конкретного чата.
 */
export interface VectorCollection {
  /** Уникальное имя коллекции */
  name: string;
  /** Идентификатор чата */
  chatId: string;
  /** Размерность векторов */
  vectorSize: number;
  /** Метрика расстояния */
  distanceMetric: DistanceMetric;
  /** Параметры индексации */
  indexParams: IndexParams;
  /** Статистика коллекции */
  stats: CollectionStats;
  /** Временная метка создания */
  createdAt: string;
  /** Временная метка последнего обновления */
  updatedAt: string;
}

/**
 * Статистика коллекции.
 * Содержит информацию о состоянии коллекции.
 */
export interface CollectionStats {
  /** Количество точек в коллекции */
  pointsCount: number;
  /** Размер коллекции в байтах */
  sizeBytes: number;
  /** Количество индексов */
  indexesCount: number;
  /** Статус индексации */
  indexingStatus: 'idle' | 'indexing' | 'completed' | 'error';
  /** Время последней индексации */
  lastIndexedAt?: string;
}

/**
 * Метрики расстояния для векторного поиска.
 */
export type DistanceMetric = 'cosine' | 'euclidean' | 'dot';

/**
 * Параметры индексации Qdrant.
 * Настройки для оптимизации поиска в векторном хранилище.
 */
export interface IndexParams {
  /** Тип индекса */
  indexType: 'hnsw' | 'flat';
  /** Параметры HNSW индекса */
  hnswConfig?: {
    /** Количество связей для каждого узла */
    m: number;
    /** Размер кандидатов для поиска */
    efConstruct: number;
    /** Размер кандидатов для поиска */
    efSearch: number;
    /** Полнота поиска */
    fullScanThreshold: number;
  };
  /** Параметры плоского индекса */
  flatConfig?: {
    /** Использовать сжатие */
    compressed: boolean;
  };
}

/**
 * Конфигурация векторного хранилища.
 * Настройки для инициализации и работы с Qdrant.
 */
export interface VectorStoreConfig {
  /** Размерность векторов по умолчанию */
  defaultVectorSize: number;
  /** Метрика расстояния по умолчанию */
  defaultDistanceMetric: DistanceMetric;
  /** Параметры индексации по умолчанию */
  defaultIndexParams: IndexParams;
  /** Время жизни кэша коллекций в миллисекундах */
  collectionCacheTimeout: number;
  /** Максимальное количество коллекций в кэше */
  maxCachedCollections: number;
}

/**
 * Результат операции с векторным хранилищем.
 * Унифицированный интерфейс для результатов всех операций.
 */
export interface VectorStoreResult<T = unknown> {
  /** Успешность операции */
  success: boolean;
  /** Результат операции */
  data?: T;
  /** Ошибка при выполнении */
  error?: string;
  /** Статус операции */
  status: VectorStoreStatus;
  /** Временная метка операции */
  timestamp: string;
  /** Дополнительные метаданные */
  metadata?: Record<string, unknown>;
}

/**
 * Статусы операций векторного хранилища.
 */
export type VectorStoreStatus =
  | 'idle'
  | 'initializing'
  | 'creating'
  | 'indexing'
  | 'searching'
  | 'updating'
  | 'deleting'
  | 'success'
  | 'error';

/**
 * Кэшированная коллекция.
 * Представляет коллекцию в кэше для оптимизации производительности.
 */
export interface CachedCollection {
  /** Данные коллекции */
  collection: VectorCollection;
  /** Время создания кэша */
  cachedAt: number;
  /** Время истечения кэша */
  expiresAt: number;
  /** Количество обращений к коллекции */
  accessCount: number;
  /** Время последнего обращения */
  lastAccessedAt: number;
}

/**
 * Опции для операций с векторным хранилищем.
 */
export interface VectorStoreOptions {
  /** Создать резервную копию перед операцией */
  createBackup?: boolean;
  /** Принудительно переиндексировать коллекцию */
  forceReindex?: boolean;
  /** Валидировать данные перед записью */
  validate?: boolean;
  /** Логировать операцию */
  logOperation?: boolean;
  /** Использовать кэш */
  useCache?: boolean;
  /** Таймаут операции в миллисекундах */
  timeout?: number;
}
