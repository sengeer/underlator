/**
 * @module ModelsTypes
 * Типы для работы с моделями.
 * Определяет интерфейсы для управления моделями в системе.
 */

/**
 * Базовая информация о модели.
 * Общий интерфейс для всех типов моделей.
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
 * Статус совместимости модели с системой.
 */
export type CompatibilityStatus =
  | 'ok'
  | 'insufficient_ram'
  | 'insufficient_vram'
  | 'unknown';

/**
 * Модель Ollama.
 * Специфичная информация для моделей Ollama.
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
  /** Статус совместимости с системой */
  compatibilityStatus?: CompatibilityStatus;
  /** Сообщение о совместимости */
  compatibilityMessages?: string[];
}

/**
 * Статус модели в системе.
 * Отслеживает состояние модели.
 */
export type ModelStatus =
  | 'available'
  | 'downloading'
  | 'installing'
  | 'error'
  | 'not_found'
  | 'corrupted';

/**
 * Каталог моделей.
 * Список доступных моделей.
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
 * Фильтры для моделей.
 * Параметры фильтрации каталога.
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
 * Интерфейс модели из API каталога.
 * Структура данных, возвращаемая эндпоинтом ollama-models.
 */
export interface ModelsApiModel {
  /** Название модели */
  name: string;
  /** Описание модели */
  description: string;
  /** Теги модели (включая квантизации) */
  tags: string[];
}

/**
 * Результат получения каталога моделей.
 * Результат операции получения списка моделей из API.
 */
export interface ModelsApiResult {
  /** Успешность операции */
  success: boolean;
  /** Список моделей */
  models?: ModelsApiModel[];
  /** Ошибка при получении */
  error?: string;
}

/**
 * Конфигурация для ModelsApi клиента.
 * Настройки для работы с API каталога моделей.
 */
export interface ModelsApiConfig {
  /** Базовый URL для API каталога моделей */
  baseUrl: string;
  /** Таймаут для HTTP запросов в миллисекундах */
  timeout: number;
  /** Количество попыток при ошибках сети */
  retryAttempts: number;
  /** Задержка между попытками в миллисекундах */
  retryDelay: number;
}

/**
 * Результат проверки совместимости.
 */
export interface CompatibilityResult {
  /** Статус совместимости */
  status: CompatibilityStatus;
  /** Сообщение для пользователя */
  message: string[];
}
