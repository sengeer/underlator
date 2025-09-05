/**
 * @module ModelsTypes
 * @description Типы для работы с моделями
 * Определяет интерфейсы для управления моделями в системе
 */

/**
 * @description Базовая информация о модели
 * Общий интерфейс для всех типов моделей
 */
export interface BaseModel {
  /** Уникальный идентификатор модели */
  id: string;
  /** Название модели */
  name: string;
  /** Отображаемое название */
  displayName: string;
  /** Описание модели */
  description?: string;
  /** Версия модели */
  version?: string;
  /** Размер модели в байтах */
  size: number;
  /** Дата создания */
  createdAt: string;
  /** Дата последнего изменения */
  modifiedAt: string;
}

/**
 * @description Модель Ollama
 * Специфичная информация для моделей Ollama
 */
export interface OllamaModelInfo extends BaseModel {
  /** Тип модели */
  type: 'ollama';
  /** Формат модели */
  format: string;
  /** Количество параметров */
  parameterSize: string;
  /** Уровень квантизации */
  quantizationLevel: string;
  /** Дополнительные метаданные */
  digest?: string;
  /** Теги модели */
  tags?: string[];
}

/**
 * @description Статус модели в системе
 * Отслеживает состояние модели
 */
export type ModelStatus =
  | 'available'
  | 'downloading'
  | 'installing'
  | 'error'
  | 'not_found'
  | 'corrupted';

/**
 * @description Прогресс загрузки модели
 * Информация о процессе загрузки
 */
export interface ModelDownloadProgress {
  /** Название модели */
  modelName: string;
  /** Текущий файл */
  currentFile: string;
  /** Прогресс текущего файла */
  fileProgress: number;
  /** Общий прогресс */
  overallProgress: number;
  /** Количество завершенных файлов */
  completedFiles: number;
  /** Общее количество файлов */
  totalFiles: number;
  /** Загруженный размер */
  downloadedSize: number;
  /** Общий размер */
  totalSize: number;
}

/**
 * @description Каталог моделей
 * Список доступных моделей
 */
export interface ModelCatalog {
  /** Модели Ollama */
  ollama: OllamaModelInfo[];
  /** Общее количество моделей */
  totalCount: number;
  /** Время последнего обновления */
  lastUpdated: string;
}

/**
 * @description Фильтры для моделей
 * Параметры фильтрации каталога
 */
export interface ModelFilters {
  /** Поисковый запрос */
  search?: string;
  /** Минимальный размер */
  minSize?: number;
  /** Максимальный размер */
  maxSize?: number;
  /** Статус модели */
  status?: ModelStatus;
  /** Теги */
  tags?: string[];
}

/**
 * @description Результат операции с моделью
 * Универсальный тип для результатов операций
 */
export interface ModelOperationResult<T = any> {
  /** Успешность операции */
  success: boolean;
  /** Результат операции */
  data?: T;
  /** Ошибка при выполнении */
  error?: string;
  /** Время выполнения */
  duration?: number;
}
