type ProviderType = 'Ollama' | 'Embedded Ollama';

/**
 * @description Статус загрузки модели
 * Определяет возможные состояния модели в процессе загрузки
 */
type ModelStatus = 'notDownloaded' | 'downloading' | 'downloaded' | 'error';

/**
 * @interface ModelUseProvider
 * @description Интерфейс провайдера для работы с моделями
 * Определяет контракт для провайдеров, работающих с LLM моделями
 * @property {() => Promise<void>} initialize - Инициализация провайдера
 * @property {(options: GenerateOptions) => void} generate - Генерация текста через модель
 * @property {() => void} abort - Прерывание текущей операции
 */
interface ModelUseProvider {
  initialize?: () => Promise<void>;
  generate: (options: GenerateOptions) => void;
  abort?: () => void;
}

/**
 * @interface GenerateOptions
 * @description Интерфейс опций для генерации текста
 * Определяет параметры для запроса генерации текста через LLM
 * @property {string | string[]} text - Текст для обработки (один или массив фрагментов)
 * @property {'en-ru' | 'ru-en'} translateLanguage - Направление перевода
 * @property {string} model - Название модели для использования
 * @property {string} url - URL для внешних API (если требуется)
 * @property {'instruction' | 'translation'} typeUse - Тип использования модели
 * @property {(response: ModelResponse) => void} onModelResponse - Callback для получения ответа модели
 * @property {(progress: Progress) => void} onProgress - Callback для отслеживания прогресса
 * @property {AbortSignal} signal - Сигнал для отмены операции
 * @property {Params} params - Дополнительные параметры генерации
 */
interface GenerateOptions {
  text: string | string[];
  translateLanguage: 'en-ru' | 'ru-en';
  model?: string;
  url?: string;
  typeUse?: 'instruction' | 'translation';
  onModelResponse?: (response: ModelResponse) => void;
  onProgress?: (progress: Progress) => void;
  signal?: AbortSignal;
  params: Params;
}

/**
 * @interface TextInfo
 * @description Интерфейс информации о текстовом узле
 * Используется для работы с DOM узлами при переводе PDF документов
 * @property {Text} node - DOM текстовый узел
 * @property {string} original - Оригинальный текст узла
 * @property {HTMLElement} element - Родительский HTML элемент
 */
interface TextInfo {
  node: Text;
  original: string;
  element: HTMLElement;
}

/**
 * @description Алгебраический тип для результата парсинга
 * Представляет результат операции парсинга с возможностью успеха или ошибки
 * @template T - Тип данных при успешном результате
 */
type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * @interface Chunk
 * @description Интерфейс фрагмента текста
 * Используется для работы с частями текста при контекстном переводе
 * @property {number} idx - Индекс фрагмента в массиве
 * @property {string} text - Содержимое фрагмента
 */
interface Chunk {
  idx: number;
  text: string;
}

/**
 * @description Тип ответа модели
 * Может быть фрагментом текста или строкой
 */
type ModelResponse = Chunk | string;

/**
 * @interface Params
 * @description Интерфейс параметров генерации
 * Определяет настройки для работы с LLM моделями
 * @property {'arrayStream' | 'stringStream' | string} responseMode - Режим получения ответа
 * @property {string} instruction - Инструкция для модели
 * @property {boolean} think - Включить режим "думания" модели
 * @property {boolean} useContextualTranslation - Использовать контекстный перевод
 * @property {number} temperature - Температура генерации (0.0 - 1.0)
 * @property {number} maxTokens - Максимальное количество токенов в ответе
 */
interface Params {
  responseMode: 'arrayStream' | 'stringStream' | string;
  instruction?: string;
  think?: boolean;
  useContextualTranslation?: boolean;
  temperature?: number;
  maxTokens?: number;
}

/**
 * @interface Progress
 * @description Интерфейс прогресса операции
 * Используется для отслеживания прогресса загрузки файлов
 * @property {string} file - Имя файла
 * @property {number} progress - Прогресс в процентах (0-100)
 */
interface Progress {
  file: string;
  progress: number;
}

/**
 * @interface Icon
 * @description Интерфейс для иконок
 * Определяет свойства для отображения SVG иконок
 * @property {number} width - Ширина иконки в пикселях
 * @property {number} height - Высота иконки в пикселях
 * @property {string} color - Цвет иконки
 * @property {React.CSSProperties} style - Дополнительные CSS стили
 */
interface Icon {
  width?: number;
  height?: number;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * @interface Message
 * @description Интерфейс сообщения
 * Используется для передачи данных между процессами
 * @property {string} status - Статус сообщения
 * @property {Progress} data - Данные прогресса
 * @property {string | any[]} output - Выходные данные
 * @property {unknown} error - Ошибка (если есть)
 */
interface Message {
  status: string;
  data?: Progress;
  output?: string | any[];
  error?: unknown;
}

/**
 * @interface ModelDownloadProgress
 * @description Интерфейс прогресса загрузки модели
 * Детальная информация о процессе загрузки модели
 * @property {string} modelName - Название модели
 * @property {string} currentFile - Текущий загружаемый файл
 * @property {number} fileProgress - Прогресс текущего файла в процентах (0-100)
 * @property {number} overallProgress - Общий прогресс загрузки в процентах (0-100)
 * @property {number} completedFiles - Количество завершенных файлов
 * @property {number} totalFiles - Общее количество файлов
 * @property {number} downloadedSize - Размер загруженных данных в байтах
 * @property {number} totalSize - Общий размер модели в байтах
 */
interface ModelDownloadProgress {
  modelName: string;
  currentFile: string;
  fileProgress: number;
  overallProgress: number;
  completedFiles: number;
  totalFiles: number;
  downloadedSize: number;
  totalSize: number;
}

/**
 * @interface Window
 * @description Расширение глобального интерфейса Window
 * Добавляет поддержку Electron API в браузерном окружении
 * @property {Object} electron - API для взаимодействия с Electron
 * @property {(message: any) => void} electron.updateTranslations - Обновление переводов
 * @property {Object} electron.ollama - API для работы с Ollama
 * @property {(request: any) => Promise<string>} electron.ollama.generate - Генерация текста
 * @property {() => Promise<void>} electron.ollama.stop - Остановка генерации
 * @property {(callback: (progress: any) => void) => () => void} electron.ollama.onGenerateProgress - Подписка на прогресс
 * @property {Object} electron.models - API для управления моделями
 * @property {(request: any) => Promise<{ success: boolean }>} electron.models.install - Установка модели
 * @property {(request: any) => Promise<{ success: boolean }>} electron.models.remove - Удаление модели
 * @property {() => Promise<any>} electron.models.list - Список моделей
 * @property {(callback: (progress: any) => void) => () => void} electron.models.onInstallProgress - Подписка на прогресс установки
 * @property {Object} electron.catalog - API для работы с каталогом моделей
 * @property {(params?: { forceRefresh?: boolean }) => Promise<any>} electron.catalog.get - Получение каталога
 * @property {(filters: any) => Promise<any>} electron.catalog.search - Поиск в каталоге
 * @property {(params: { modelName: string }) => Promise<any>} electron.catalog.getModelInfo - Информация о модели
 * @property {Object} electron.splash - API для splash screen
 * @property {() => Promise<any>} electron.splash.getStatus - Статус splash screen
 * @property {(callback: (status: any) => void) => () => void} electron.splash.onStatusUpdate - Подписка на обновления статуса
 * @property {(callback: (progress: any) => void) => () => void} electron.splash.onProgressUpdate - Подписка на обновления прогресса
 * @property {(callback: () => void) => () => void} electron.splash.onComplete - Подписка на завершение
 * @property {(callback: (error: any) => void) => () => void} electron.splash.onError - Подписка на ошибки
 */
interface Window {
  electron: {
    updateTranslations: (message: any) => void;
    ollama: {
      generate: (request: any) => Promise<any>;
      stop: () => Promise<void>;
      onGenerateProgress: (callback: (progress: any) => void) => () => void;
    };
    models: {
      install: (request: any) => Promise<{ success: boolean }>;
      remove: (request: any) => Promise<{ success: boolean }>;
      list: () => Promise<any>;
      onInstallProgress: (callback: (progress: any) => void) => () => void;
    };
    catalog: {
      get: (params?: { forceRefresh?: boolean }) => Promise<any>;
      search: (filters: any) => Promise<any>;
      getModelInfo: (params: { modelName: string }) => Promise<any>;
    };
    splash: {
      getStatus: () => Promise<any>;
      onStatusUpdate: (callback: (status: any) => void) => () => void;
      onProgressUpdate: (callback: (progress: any) => void) => () => void;
      onComplete: (callback: () => void) => () => void;
      onError: (callback: (error: any) => void) => () => void;
    };
  };
}
