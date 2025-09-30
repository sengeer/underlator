/**
 * @module GlobalTypes
 * Глобальные типы для проекта.
 */

/**
 * Типы существующих провайдеров в приложении.
 */
type ProviderType = 'Ollama' | 'Embedded Ollama';

/**
 * Статус загрузки модели.
 * Определяет возможные состояния модели в процессе загрузки.
 */
type ModelStatus = 'notDownloaded' | 'downloading' | 'downloaded' | 'error';

/**
 * Интерфейс провайдера для работы с моделями.
 * Определяет контракт для провайдеров, работающих с LLM моделями.
 */
interface ModelUseProvider {
  /** Инициализация провайдера */
  initialize?: () => Promise<void>;
  /** Генерация текста через модель */
  generate: (options: GenerateOptions) => void;
  /** Прерывание текущей операции */
  abort?: () => void;
}

/**
 * Интерфейс опций для генерации текста.
 * Определяет параметры для запроса генерации текста через LLM.
 */
interface GenerateOptions {
  /** Текст для обработки (один или массив фрагментов) */
  text: string | string[];
  /** Направление перевода */
  translateLanguage: 'en-ru' | 'ru-en';
  /** Название модели для использования */
  model?: string;
  /** URL для внешних API (если требуется) */
  url?: string;
  /** Тип использования модели */
  typeUse?: 'instruction' | 'translation';
  /** Callback для получения ответа модели */
  onModelResponse?: (response: ModelResponse) => void;
  /** Callback для отслеживания прогресса */
  onProgress?: (progress: Progress) => void;
  /** Сигнал для отмены операции */
  signal?: AbortSignal;
  /** Дополнительные параметры генерации */
  params: Params;
}

/**
 * Интерфейс информации о текстовом узле.
 * Используется для работы с DOM узлами при переводе PDF документов.
 */
interface TextInfo {
  /** DOM текстовый узел */
  node: Text;
  /** Оригинальный текст узла */
  original: string;
  /** Родительский HTML элемент */
  element: HTMLElement;
}

/**
 * Алгебраический тип для результата парсинга.
 * Представляет результат операции парсинга с возможностью успеха или ошибки.
 */
type ParseResult<T> =
  /** Успешное выполнение парсинга */
  | { success: true; data: T }
  /** Ошибка при парсинге */
  | { success: false; error: string };

/**
 * Интерфейс фрагмента текста.
 * Используется для работы с частями текста при контекстном переводе.
 */
interface Chunk {
  /** Индекс фрагмента в массиве */
  idx: number;
  /** Содержимое фрагмента */
  text: string;
}

/**
 * Тип ответа модели.
 * Может быть фрагментом текста или строкой.
 */
type ModelResponse = Chunk | string;

/**
 * Интерфейс параметров генерации.
 * Определяет настройки для работы с LLM моделями.
 */
interface Params {
  /** Режим получения ответа */
  responseMode: 'arrayStream' | 'stringStream' | string;
  /** Инструкция для модели */
  instruction?: string;
  /** Включить режим "думания" модели */
  think?: boolean;
  /** Использовать контекстный перевод */
  useContextualTranslation?: boolean;
  /** Температура генерации (0.0 - 1.0) */
  temperature?: number;
  /** Максимальное количество токенов в ответе */
  maxTokens?: number;
}

/**
 * Интерфейс прогресса операции.
 * Используется для отслеживания прогресса загрузки файлов.
 */
interface Progress {
  /** Имя файла */
  file: string;
  /** Прогресс в процентах (0-100) */
  progress: number;
}

/**
 * Интерфейс для иконок.
 * Определяет свойства для отображения SVG иконок.
 */
interface Icon {
  /** Ширина иконки в пикселях */
  width?: number;
  /** Высота иконки в пикселях */
  height?: number;
  /** Цвет иконки */
  color?: string;
  /** Дополнительные CSS стили */
  style?: React.CSSProperties;
}

/**
 * Интерфейс сообщения.
 * Используется для передачи данных между процессами.
 */
interface Message {
  /** Статус сообщения */
  status: string;
  /** Данные прогресса */
  data?: Progress;
  /** Выходные данные */
  output?: string | any[];
  /** Ошибка (если есть) */
  error?: unknown;
}

/**
 * Интерфейс прогресса загрузки модели.
 * Детальная информация о процессе загрузки модели.
 */
interface ModelDownloadProgress {
  /** Название модели */
  modelName: string;
  /** Текущий загружаемый файл */
  currentFile: string;
  /** Прогресс текущего файла в процентах (0-100) */
  fileProgress: number;
  /** Общий прогресс загрузки в процентах (0-100) */
  overallProgress: number;
  /** Количество завершенных файлов */
  completedFiles: number;
  /** Общее количество файлов */
  totalFiles: number;
  /** Размер загруженных данных в байтах */
  downloadedSize: number;
  /** Общий размер модели в байтах */
  totalSize: number;
}

/**
 * Расширение глобального интерфейса Window.
 * Добавляет поддержку Electron API в браузерном окружении.
 */
interface Window {
  /** API для Electron */
  electron: {
    /** Обновление переводов */
    updateTranslations: (message: any) => void;
    /** API для работы с Ollama */
    ollama: {
      /** Генерация текста через модель */
      generate: (request: any) => Promise<any>;
      /** Остановка генерации */
      stop: () => Promise<void>;
      /** Подписка на прогресс генерации */
      onGenerateProgress: (callback: (progress: any) => void) => () => void;
    };
    /** API для работы с моделями */
    models: {
      /** Установка модели */
      install: (request: any) => Promise<{ success: boolean }>;
      /** Удаление модели */
      remove: (request: any) => Promise<{ success: boolean }>;
      /** Список моделей */
      list: () => Promise<any>;
      /** Подписка на прогресс установки */
      onInstallProgress: (callback: (progress: any) => void) => () => void;
    };
    /** API для работы с каталогом моделей */
    catalog: {
      /** Получение каталога моделей */
      get: (params?: { forceRefresh?: boolean }) => Promise<any>;
      /** Поиск в каталоге моделей */
      search: (filters: any) => Promise<any>;
      /** Информация о модели */
      getModelInfo: (params: { modelName: string }) => Promise<any>;
    };
    /** API для работы с splash screen */
    splash: {
      /** Получение статуса splash screen */
      getStatus: () => Promise<any>;
      /** Подписка на обновления статуса */
      onStatusUpdate: (callback: (status: any) => void) => () => void;
      /** Подписка на обновления прогресса */
      onProgressUpdate: (callback: (progress: any) => void) => () => void;
      /** Подписка на завершение */
      onComplete: (callback: () => void) => () => void;
      /** Подписка на ошибки */
      onError: (callback: (error: any) => void) => () => void;
    };
  };
}
