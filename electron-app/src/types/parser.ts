/**
 * @module ParserTypes
 * Типы для работы с парсером.
 * Определяет интерфейсы для HTML парсинга моделей с сайта Ollama.
 */

/**
 * Интерфейс для модели из HTML парсинга.
 * Структура данных модели, извлеченной с сайта Ollama.
 */
export interface ParsedModel {
  /** Название модели */
  name: string;
  /** Описание модели */
  description?: string;
  /** Теги модели (включая квантизации) */
  tags: string[];
  /** Размер модели в байтах (приблизительный) */
  size?: number;
  /** Количество скачиваний */
  downloads?: number;
  /** Дата последнего обновления */
  lastUpdated?: string;
  /** Категория модели */
  category?: string;
  /** Базовое название модели без тега */
  baseName?: string;
  /** Тег модели (квантизация) */
  tag?: string;
}

/**
 * Интерфейс для квантизированной модели.
 * Отдельная запись для каждой квантизации модели.
 */
export interface QuantizedModel {
  /** Полное название модели с тегом */
  fullName: string;
  /** Базовое название модели */
  baseName: string;
  /** Тег квантизации */
  tag: string;
  /** Описание модели */
  description?: string;
  /** Размер модели в байтах */
  size?: number;
  /** Количество скачиваний */
  downloads?: number;
  /** Дата последнего обновления */
  lastUpdated?: string;
  /** Категория модели */
  category?: string;
  /** Теги модели */
  tags: string[];
}

/**
 * Интерфейс для результата парсинга.
 * Результат операции парсинга HTML.
 */
export interface ParseResult {
  /** Успешность операции */
  success: boolean;
  /** Извлеченные модели */
  models?: ParsedModel[];
  /** Квантизированные модели */
  quantizedModels?: QuantizedModel[];
  /** Ошибка при парсинге */
  error?: string;
}
