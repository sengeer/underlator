// use
/**
 * @interface OllamaModelInfo
 * @description Информация о модели Ollama
 * Упрощенная версия для использования в Settings виджете
 * @property {string} name - Название модели
 * @property {number} size - Размер модели в байтах
 * @property {string} description - Описание модели
 * @property {string[]} tags - Теги модели
 * @property {string} format - Формат модели
 * @property {string} parameterSize - Количество параметров
 * @property {string} quantizationLevel - Уровень квантизации
 */
export interface OllamaModelInfo {
  name: string;
  size: number;
  description?: string;
  tags?: string[];
  format?: string;
  parameterSize?: string;
  quantizationLevel?: string;
}

// use
/**
 * @interface ModelCatalog
 * @description Каталог моделей
 * Содержит список доступных моделей Ollama
 * @property {OllamaModelInfo[]} ollama - Модели Ollama
 * @property {number} totalCount - Общее количество моделей
 * @property {string} lastUpdated - Время последнего обновления
 */
export interface ModelCatalog {
  ollama: OllamaModelInfo[];
  totalCount: number;
  lastUpdated: string;
}

// use
/**
 * @interface GetCatalogParams
 * @description Параметры для получения каталога моделей
 * Поддерживает принудительное обновление кэша
 * @property {boolean} forceRefresh - Принудительное обновление, игнорируя кэш
 */
export interface GetCatalogParams {
  forceRefresh?: boolean;
}

// use
/**
 * @interface ModelSearchFilters
 * @description Фильтры для поиска моделей в каталоге
 * Расширяет базовые фильтры специфичными для Settings параметрами
 * @property {string} search - Поисковый запрос по названию модели
 * @property {number} minSize - Минимальный размер модели в байтах
 * @property {number} maxSize - Максимальный размер модели в байтах
 * @property {string[]} tags - Теги модели
 * @property {string} type - Тип модели
 * @property {string} sortBy - Сортировка результатов
 * @property {string} sortOrder - Порядок сортировки
 * @property {number} limit - Количество результатов на странице
 * @property {number} offset - Смещение для пагинации
 */
export interface ModelSearchFilters {
  search?: string;
  minSize?: number;
  maxSize?: number;
  tags?: string[];
  type?: 'ollama';
  sortBy?: 'name' | 'size' | 'downloads' | 'rating' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// use
/**
 * @interface InstallModelParams
 * @description Параметры для установки модели
 * Информация необходимая для загрузки модели через Ollama
 * @property {string} name - Название модели для установки
 * @property {string} tag - Необязательный тег модели
 */
export interface InstallModelParams {
  name: string;
  tag?: string;
}

// use
/**
 * @interface RemoveModelParams
 * @description Параметры для удаления модели
 * Информация для удаления установленной модели
 * @property {string} name - Название модели для удаления
 */
export interface RemoveModelParams {
  name: string;
}

// use
/**
 * @interface GetModelInfoParams
 * @description Параметры для получения информации о модели
 * Используется для получения детальной информации о конкретной модели
 * @property {string} modelName - Название модели
 */
export interface GetModelInfoParams {
  modelName: string;
}

// use
/**
 * @interface ModelInstallProgress
 * @description Прогресс установки модели
 * Информация о процессе загрузки модели через Ollama
 * @property {string} status - Статус операции
 * @property {string} name - Название модели
 * @property {number} size - Размер загруженных данных (legacy)
 * @property {number} completed - Размер загруженных данных
 * @property {number} total - Общий размер модели
 * @property {string} error - Ошибка при установке
 */
export interface ModelInstallProgress {
  status: 'downloading' | 'verifying' | 'writing' | 'complete' | 'error';
  name: string;
  size?: number;
  completed?: number;
  total?: number;
  error?: string;
}

// use
/**
 * @interface ModelOperationResult
 * @description Результат операции с моделями
 * Стандартизированный ответ для всех операций с моделями
 * @property {boolean} success - Успешность операции
 * @property {T} data - Результат операции
 * @property {string} error - Ошибка при выполнении
 */
export interface ModelOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// use
/**
 * @type ModelProgressCallback
 * @description Callback для обработки прогресса установки
 * Функция для обработки streaming прогресса загрузки моделей
 * @param {ModelInstallProgress} progress - Прогресс установки модели
 */
export type ModelProgressCallback = (progress: ModelInstallProgress) => void;

// use
/**
 * @type ModelErrorCallback
 * @description Callback для обработки ошибок
 * Функция для обработки ошибок при операциях с моделями
 * @param {string} error - Ошибка при операции с моделью
 */
export type ModelErrorCallback = (error: string) => void;

// use
/**
 * @interface SettingsApiConfig
 * @description Конфигурация для API клиента
 * Настройки для работы с Electron API
 * @property {number} timeout - Таймаут для операций в миллисекундах
 * @property {number} maxRetries - Максимальное количество попыток при ошибках
 * @property {number} retryDelay - Задержка между попытками в миллисекундах
 * @property {boolean} enableLogging - Включить логирование операций
 */
export interface SettingsApiConfig {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
}

//use
/**
 * @interface CatalogState
 * @description Состояние каталога моделей
 * Информация о текущем состоянии каталога в Redux store
 * @property {ModelCatalog | null} catalog - Каталог моделей
 * @property {boolean} loading - Статус загрузки каталога
 * @property {string | null} error - Ошибка при загрузке каталога
 * @property {number | null} lastUpdated - Время последнего обновления
 * @property {boolean} forceRefresh - Принудительное обновление
 */
export interface CatalogState {
  catalog: ModelCatalog | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  forceRefresh: boolean;
}

//use
/**
 * @interface InstallationState
 * @description Состояние процесса установки моделей
 * Информация о текущих процессах установки моделей
 * @property {Record<string, ModelInstallProgress>} progress - Прогресс установки для каждой модели
 * @property {string[]} installing - Модели в процессе установки
 * @property {string[]} removing - Модели в процессе удаления
 * @property {Record<string, string>} errors - Ошибки установки
 */
export interface InstallationState {
  progress: Record<string, ModelInstallProgress>;
  installing: string[];
  removing: string[];
  errors: Record<string, string>;
}

//use
/**
 * @interface SearchState
 * @description Состояние поиска и фильтрации
 * Информация о текущих параметрах поиска
 * @property {string} query - Текущий поисковый запрос
 * @property {ModelSearchFilters} filters - Активные фильтры
 * @property {OllamaModelInfo[]} filteredResults - Отфильтрованные результаты
 * @property {boolean} searching - Статус поиска
 */
export interface SearchState {
  query: string;
  filters: ModelSearchFilters;
  filteredResults: OllamaModelInfo[];
  searching: boolean;
}

//use
/**
 * @interface ManageModelsState
 * @description Общее состояние управления моделями
 * Объединяет все состояния для управления моделями в Settings
 * @property {CatalogState} catalog - Состояние каталога
 * @property {InstallationState} installation - Состояние установки
 * @property {SearchState} search - Состояние поиска
 * @property {boolean} loading - Статус загрузки
 * @property {string | null} error - Ошибка при загрузке
 */
export interface ManageModelsState {
  catalog: CatalogState;
  installation: InstallationState;
  search: SearchState;
  loading: boolean;
  error: string | null;
}

//use
/**
 * @interface InstallModelPayload
 * @description Payload для успешной установки модели
 * Возвращается из Redux thunk при успешной установке
 * @property {boolean} success - Успешность операции
 * @property {string} modelName - Название установленной модели
 * @property {any} data - Данные операции (если есть)
 * @property {string} error - Ошибка (если есть)
 */
export interface InstallModelPayload {
  success: boolean;
  modelName: string;
  data?: any;
  error?: string;
}

//use
/**
 * @interface RemoveModelPayload
 * @description Payload для успешного удаления модели
 * Возвращается из Redux thunk при успешном удалении
 * @property {boolean} success - Успешность операции
 * @property {string} modelName - Название удаленной модели
 * @property {string} firstInstalledModel - Первая установленная модель после удаления
 * @property {any} data - Данные операции (если есть)
 * @property {string} error - Ошибка (если есть)
 */
export interface RemoveModelPayload {
  success: boolean;
  modelName: string;
  firstInstalledModel: string;
  data?: any;
  error?: string;
}

/**
 * @interface ManageModelsProps
 * @description Пропсы для компонента ManageModels
 * Основной компонент для управления моделями Embedded Ollama
 * @property {() => void} onClose - Функция закрытия модального окна
 * @property {string} className - Дополнительные CSS классы
 * @property {React.CSSProperties} style - Дополнительные стили
 */
export interface ManageModelsProps {
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * @interface ModelDisplayState
 * @description Состояние модели для отображения в SelectorOption
 * Определяет как модель должна отображаться в списке
 * @property {string} name - Название модели
 * @property {string} state - Состояние модели для SelectorOption
 * @property {boolean} isActive - Активна ли модель (выбрана ли)
 * @property {Object} progressInfo - Информация о прогрессе установки
 * @property {Object} actionHandlers - Обработчики действий
 * @property {Object} metadata - Дополнительная информация о модели
 */
export interface ModelDisplayState {
  name: string;
  state: 'available' | 'loading' | 'installed';
  isActive?: boolean;
  progressInfo?: {
    percentage: number;
    currentSize: number;
    totalSize: number;
  };
  actionHandlers?: {
    onInstall?: () => void;
    onRemove?: () => void;
    onSelect?: () => void;
  };
  metadata?: {
    size?: number;
    description?: string;
    tags?: string[];
  };
}

/**
 * @interface ModelEventCallbacks
 * @description Callback для обработки событий моделей
 * Функции для обработки различных событий
 * @property {Function} onModelSelect - Обработчик выбора модели
 * @property {Function} onModelInstall - Обработчик установки модели
 * @property {Function} onModelRemove - Обработчик удаления модели
 */
export interface ModelEventCallbacks {
  onModelSelect?: (modelName: string) => void;
  onModelInstall?: (modelName: string) => void;
  onModelRemove?: (modelName: string) => void;
}
