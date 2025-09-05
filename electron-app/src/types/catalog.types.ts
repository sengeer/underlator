/**
 * @module CatalogTypes
 * @description Типы для работы с каталогом моделей Ollama
 * Определяет интерфейсы для получения, фильтрации и управления каталогом моделей
 *
 * Основные типы:
 * - CatalogFilters: параметры фильтрации и поиска
 */

import type { ModelStatus, ModelCatalog } from './models.types';

/**
 * @description Расширенные фильтры для каталога
 * Параметры для фильтрации и поиска в каталоге моделей
 */
export interface CatalogFilters {
  /** Поисковый запрос */
  search?: string;
  /** Тип модели */
  type?: 'ollama';
  /** Статус модели в локальной системе */
  localStatus?: ModelStatus;
  /** Минимальный размер модели в байтах */
  minSize?: number;
  /** Максимальный размер модели в байтах */
  maxSize?: number;
  /** Категория модели */
  category?: string;
  /** Теги модели */
  tags?: string[];
  /** Поддерживаемые языки */
  languages?: string[];
  /** Архитектура модели */
  architecture?: string;
  /** Формат модели */
  format?: string;
  /** Лицензия модели */
  license?: string;
  /** Автор модели */
  author?: string;
  /** Минимальный рейтинг */
  minRating?: number;
  /** Минимальное количество скачиваний */
  minDownloads?: number;
  /** Только рекомендуемые модели */
  recommendedOnly?: boolean;
  /** Только доступные для установки */
  availableOnly?: boolean;
  /** Сортировка результатов */
  sortBy?:
    | 'name'
    | 'size'
    | 'downloads'
    | 'rating'
    | 'lastUpdated'
    | 'popularity'
    | 'createdAt';
  /** Порядок сортировки */
  sortOrder?: 'asc' | 'desc';
  /** Количество результатов на странице */
  limit?: number;
  /** Смещение для пагинации */
  offset?: number;
}

/**
 * @description Конфигурация для ModelCatalog сервиса
 * Настройки для работы с локальным Ollama API
 */
export interface ModelCatalogConfig {
  /** Базовый URL для локального Ollama API */
  ollamaUrl: string;
  /** Таймаут для HTTP запросов в миллисекундах */
  timeout: number;
  /** Время жизни кэша в миллисекундах */
  cacheTimeout: number;
  /** Максимальное количество попыток */
  maxRetries: number;
  /** Задержка между попытками в миллисекундах */
  retryDelay: number;
}

/**
 * @description Интерфейс для кэшированных данных каталога
 * Структура для хранения кэшированного каталога моделей
 */
export interface CachedCatalog {
  /** Данные каталога */
  catalog: ModelCatalog;
  /** Время создания кэша */
  timestamp: number;
  /** Время истечения кэша */
  expiresAt: number;
}
