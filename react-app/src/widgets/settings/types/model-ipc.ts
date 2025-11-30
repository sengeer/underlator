/**
 * @module ModelIpcTypes
 * Типы для работы с Model IPC API.
 */

/**
 * Статус совместимости модели с системой.
 */
export type CompatibilityStatus =
  | 'ok'
  | 'insufficient_ram'
  | 'insufficient_vram'
  | 'unknown';

/**
 * Информация о модели Ollama.
 * Упрощенная версия для использования в Settings виджете.
 */
export interface OllamaModelInfo {
  /** Название модели */
  name: string;
  /** Размер модели */
  size: number;
  /** Описание модели */
  description?: string;
  /** Теги модели */
  tags?: string[];
  /** Формат модели */
  format?: string;
  /** Количество параметров */
  parameterSize?: string;
  /** Уровень квантизации */
  quantizationLevel?: string;
  /** Статус совместимости с системой */
  compatibilityStatus?: CompatibilityStatus;
  /** Сообщение о совместимости */
  compatibilityMessages?: string[];
}

/**
 * Каталог моделей.
 * Содержит список доступных моделей Ollama.
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
 * Параметры для получения каталога моделей.
 * Поддерживает принудительное обновление кэша.
 */
export interface GetCatalogParams {
  /** Принудительное обновление, игнорируя кэш */
  forceRefresh?: boolean;
}

/**
 * Фильтры для поиска моделей в каталоге.
 * Расширяет базовые фильтры специфичными для Settings параметрами.
 */
export interface ModelSearchFilters {
  /** Поисковый запрос по названию модели */
  search?: string;
  /** Минимальный размер модели в байтах */
  minSize?: number;
  /** Максимальный размер модели в байтах */
  maxSize?: number;
  /** Теги модели */
  tags?: string[];
  /** Тип модели */
  type?: 'embedding' | 'ollama';
  /** Сортировка результатов */
  sortBy?: 'name' | 'size' | 'downloads' | 'rating' | 'lastUpdated';
  /** Порядок сортировки */
  sortOrder?: 'asc' | 'desc';
  /** Количество результатов на странице */
  limit?: number;
  /** Смещение для пагинации */
  offset?: number;
}

/**
 * Параметры для установки модели.
 * Информация необходимая для загрузки модели через Ollama.
 */
export interface InstallModelParams {
  /** Название модели для установки */
  name: string;
  /** Необязательный тег модели */
  tag?: string;
  /** Целевая подсистема для синхронизации (LLM или RAG) */
  target?: 'provider' | 'rag';
}

/**
 * Параметры для удаления модели.
 * Информация для удаления установленной модели.
 */
export interface RemoveModelParams {
  /** Название модели для удаления */
  name: string;
  /** Целевая подсистема для синхронизации (LLM или RAG) */
  target?: 'provider' | 'rag';
}

/**
 * Параметры для получения информации о модели.
 * Используется для получения детальной информации о конкретной модели.
 */
export interface GetModelInfoParams {
  /** Название модели */
  modelName: string;
}

/**
 * Прогресс установки модели.
 * Информация о процессе загрузки модели через Ollama.
 */
export interface ModelInstallProgress {
  /** Статус операции */
  status: 'downloading' | 'verifying' | 'writing' | 'complete' | 'error';
  /** Название модели */
  name: string;
  /** Размер загруженных данных (legacy) */
  size?: number;
  /** Размер загруженных данных */
  completed?: number;
  /** Общий размер модели */
  total?: number;
  /** Ошибка при установке */
  error?: string;
}

/**
 * Результат операции с моделями.
 * Стандартизированный ответ для всех операций с моделями.
 */
export interface ModelOperationResult<T = any> {
  /** Успешность операции */
  success: boolean;
  /** Результат операции */
  data?: T;
  /** Ошибка при выполнении */
  error?: string;
}

/**
 * Callback для обработки прогресса установки.
 * Функция для обработки streaming прогресса загрузки моделей.
 */
export type ModelProgressCallback =
  /** Прогресс установки модели */
  (progress: ModelInstallProgress) => void;

/**
 * Callback для обработки ошибок.
 * Функция для обработки ошибок при операциях с моделями.
 */
export type ModelErrorCallback =
  /** Ошибка при операции с моделью */
  (error: string) => void;

/**
 * Конфигурация для API клиента.
 * Настройки для работы с Electron API.
 */
export interface SettingsApiConfig {
  /** Таймаут для операций в миллисекундах */
  timeout?: number;
  /** Максимальное количество попыток при ошибках */
  maxRetries?: number;
  /** Задержка между попытками в миллисекундах */
  retryDelay?: number;
  /** Включить логирование операций */
  enableLogging?: boolean;
}

/**
 * Состояние каталога моделей.
 * Информация о текущем состоянии каталога в Redux store.
 */
export interface CatalogState {
  /** Каталог моделей */
  catalog: ModelCatalog | null;
  /** Статус загрузки каталога */
  loading: boolean;
  /** Ошибка при загрузке каталога */
  error: string | null;
  /** Время последнего обновления */
  lastUpdated: number | null;
  /** Принудительное обновление */
  forceRefresh: boolean;
}

/**
 * Состояние процесса установки моделей.
 * Информация о текущих процессах установки моделей.
 */
export interface InstallationState {
  /** Прогресс установки для каждой модели */
  progress: Record<string, ModelInstallProgress>;
  /** Модели в процессе установки */
  installing: string[];
  /** Модели в процессе удаления */
  removing: string[];
  /** Ошибки установки для каждой модели */
  errors: Record<string, string>;
}

/**
 * Состояние поиска и фильтрации.
 * Информация о текущих параметрах поиска.
 */
export interface SearchState {
  /** Текущий поисковый запрос */
  query: string;
  /** Активные фильтры */
  filters: ModelSearchFilters;
  /** Отфильтрованные результаты */
  filteredResults: OllamaModelInfo[];
  /** Статус поиска */
  searching: boolean;
}

/**
 * Общее состояние управления моделями.
 * Объединяет все состояния для управления моделями в Settings.
 */
export interface ManageModelsState {
  /** Состояние каталога */
  catalog: CatalogState;
  /** Состояние установки */
  installation: InstallationState;
  /** Состояние поиска */
  search: SearchState;
  /** Статус загрузки */
  loading: boolean;
  /** Ошибка при загрузке */
  error: string | null;
}

/**
 * Payload для успешной установки модели.
 * Возвращается из Redux thunk при успешной установке.
 */
export interface InstallModelPayload {
  /** Успешность операции */
  success: boolean;
  /** Название установленной модели */
  modelName: string;
  /** Данные операции (если есть) */
  data?: any;
  /** Ошибка (если есть) */
  error?: string;
}

/**
 * Payload для успешного удаления модели.
 * Возвращается из Redux thunk при успешном удалении.
 */
export interface RemoveModelPayload {
  /** Успешность операции */
  success: boolean;
  /** Название удаленной модели */
  modelName: string;
  /** Первая установленная модель после удаления */
  firstInstalledModel: string;
  /** Данные операции (если есть) */
  data?: any;
  /** Ошибка (если есть) */
  error?: string;
}

/**
 * Пропсы для компонента ManageModels.
 * Основной компонент для управления моделями Embedded Ollama.
 */
export interface ManageModelsProps {
  /** Состояние открытия модального окна */
  isOpened: boolean;
  /** Функция закрытия модального окна */
  onClose: () => void;
  /** Контекст использования: выбор основной модели или модели эмбеддингов */
  mode?: 'provider' | 'rag';
}

/**
 * Состояние модели для отображения в SelectorOption.
 * Определяет как модель должна отображаться в списке.
 */
export interface ModelDisplayState {
  /** Название модели */
  name: string;
  /** Состояние модели для SelectorOption */
  state: 'available' | 'loading' | 'installed';
  /** Активна ли модель (выбрана ли) */
  isActive?: boolean;
  /** Информация о прогрессе установки */
  progressInfo?: {
    percentage: number;
    currentSize: number;
    totalSize: number;
  };
  /** Обработчики действий */
  actionHandlers?: {
    onInstall?: () => void;
    onRemove?: () => void;
    onSelect?: () => void;
  };
  /** Дополнительная информация о модели */
  metadata?: {
    size?: number;
    description?: string;
    tags?: string[];
  };
}

/**
 * Callback для обработки событий моделей.
 * Функции для обработки различных событий.
 */
export interface ModelEventCallbacks {
  /** Обработчик выбора модели */
  onModelSelect?: (modelName: string) => void;
  /** Обработчик установки модели */
  onModelInstall?: (modelName: string) => void;
  /** Обработчик удаления модели */
  onModelRemove?: (modelName: string) => void;
}
