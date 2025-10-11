/**
 * @module GlobalTypes
 * Глобальные типы React приложения.
 */

/**
 * Типы существующих провайдеров в приложении.
 */
type ProviderType = 'Ollama' | 'Embedded Ollama';

/**
 * Настройки конекретного провайдера.
 * Интерфейс для хранения специфичных настроек каждого провайдера.
 */
interface ProviderSettings {
  /** Идентификатор провайдера */
  id: string;
  /** URL провайдера */
  url: string;
  /** Название модели для использования */
  model?: string;
  /** Тип использования модели */
  typeUse?: 'instruction' | 'translation';
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
 * Дополнительные опции модели, перечисленные в Modelfile, такие как temperature.
 */
interface GenerateOptions {
  /** Температура генерации (0.0 - 1.0) */
  temperature?: number;
  /** Максимальное количество токенов в ответе */
  max_tokens?: number;
  /** Количество вариантов ответа */
  num_predict?: number;
  /** Включить режим "думания" модели */
  think?: boolean;
}

/**
 * Интерфейс параметров генерации.
 * Определяет настройки для работы с LLM моделями через хук useModel.
 */
interface UseModelParams {
  /** Режим получения ответа */
  responseMode: 'arrayStream' | 'stringStream' | string;
  /** Инструкция для модели */
  instruction?: string;
  /** Использовать контекстный перевод */
  useContextualTranslation?: boolean;
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
 * Расширение глобального интерфейса Window.
 * Добавляет поддержку Electron API в браузерном окружении.
 */
interface Window {
  /** API для Electron */
  electron: {
    /** Обновление переводов */
    updateTranslations: (message: any) => void;
    /** API для работы с моделями */
    model: {
      /** Генерация текста через модель */
      generate: (request: any, settings?: any) => Promise<any>;
      /** Остановка генерации */
      stop: () => Promise<void>;
      /** Подписка на прогресс генерации */
      onGenerateProgress: (callback: (progress: any) => void) => () => void;
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
