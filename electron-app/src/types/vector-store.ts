/**
 * @module VectorStoreTypes
 * Типы для работы с векторным хранилищем.
 */

/**
 * Интерфейс для строки чанка.
 */
export interface ChunkRow {
  /** Уникальный идентификатор чанка */
  id: string;
  /** Имя коллекции */
  collection_name: string;
  /** Идентификатор чата */
  chat_id: string;
  /** Содержимое чанка */
  content: string;
  /** Векторные эмбеддинги чанка */
  embedding: string;
  /** Метаданные чанка */
  metadata: string;
  /** Временная метка создания */
  created_at: string;
  /** Временная метка обновления */
  updated_at: string;
}

/**
 * Интерфейс для строки статистики.
 */
export interface StatsRow {
  /** Количество чанков */
  count: number;
  /** Размер коллекции */
  size: number | null;
}

/**
 * Интерфейс для строки коллекции.
 */
export interface CollectionRow {
  /** Имя коллекции */
  name: string;
  /** Идентификатор чата */
  chat_id: string;
  /** Размерность векторов */
  vector_size: number;
  /** Метрика расстояния */
  distance_metric: string;
  /** Временная метка создания */
  created_at: string;
  /** Временная метка обновления */
  updated_at: string;
}
