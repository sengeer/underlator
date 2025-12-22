/**
 * @module PromptManagerTypes
 * Типы для системы управления промптами.
 */

/**
 * Режим использования промпта.
 * Определяет контекст, в котором используется промпт.
 */
export type PromptMode =
  | 'chat'
  | 'contextualTranslation'
  | 'simpleTranslation'
  | 'instruction';

/**
 * Метаданные шаблона промпта.
 * Содержит информацию о шаблоне для валидации и управления.
 */
export interface PromptTemplateMetadata {
  /** Описание назначения промпта */
  description: string;
  /** Режим использования промпта */
  mode: PromptMode;
  /** Обязательные плейсхолдеры, которые должны быть в шаблоне */
  requiredPlaceholders: string[];
  /** Опциональные плейсхолдеры, которые могут быть в шаблоне */
  optionalPlaceholders?: string[];
  /** Версия шаблона для миграции */
  version?: string;
}

/**
 * Шаблон промпта.
 * Определяет структуру промпта с поддержкой плейсхолдеров.
 */
export interface PromptTemplate {
  /** Уникальный идентификатор шаблона */
  id: string;
  /** Содержимое промпта с плейсхолдерами в формате {placeholder} */
  content: string;
  /** Метаданные шаблона */
  metadata: PromptTemplateMetadata;
  /** Дата создания шаблона */
  createdAt?: string;
  /** Дата последнего обновления */
  updatedAt?: string;
}

/**
 * Конфигурация промпта для различных режимов.
 * Содержит настройки для каждого режима работы с LLM.
 */
export interface PromptConfig {
  /** Конфигурация для режима чата */
  chat?: {
    /** Системный промпт */
    systemPrompt?: string;
    /** Правила чата */
    rulesPrompt?: string;
  };
  /** Конфигурация для контекстного перевода */
  contextualTranslation?: {
    /** Шаблон промпта для контекстного перевода */
    template?: string;
  };
  /** Конфигурация для простого перевода */
  simpleTranslation?: {
    /** Шаблон промпта для простого перевода */
    template?: string;
  };
  /** Конфигурация для инструкций */
  instruction?: {
    /** Шаблон промпта для инструкций */
    template?: string;
  };
}

/**
 * Результат валидации промпта.
 * Используется для проверки корректности шаблона перед сохранением.
 */
export interface PromptValidationResult {
  /** Успешна ли валидация */
  valid: boolean;
  /** Сообщение об ошибке, если валидация не прошла */
  error?: string;
  /** Список отсутствующих обязательных плейсхолдеров */
  missingPlaceholders?: string[];
  /** Список неиспользуемых плейсхолдеров */
  unusedPlaceholders?: string[];
}

/**
 * Интерфейс для хранения промптов.
 * Определяет структуру данных для сохранения в localStorage.
 */
export interface PromptStorage {
  /** Версия схемы хранения для миграции */
  version: string;
  /** Шаблоны промптов по режимам */
  templates: Record<PromptMode, PromptTemplate>;
  /** Дата последнего обновления */
  updatedAt: string;
}

/**
 * Карта плейсхолдеров для подстановки в промпт.
 * Ключ - имя плейсхолдера, значение - строка для подстановки.
 */
export type PlaceholderMap = Record<string, string>;

/**
 * Результат операции с промптом.
 * Алгебраический тип для обработки успешных и ошибочных результатов.
 */
export type PromptResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
