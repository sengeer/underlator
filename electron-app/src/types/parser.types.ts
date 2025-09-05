/**
 * @module ParserTypes
 * @description Типы для работы с парсером
 * Определяет интерфейсы для HTML парсинга моделей с сайта Ollama
 */

/**
 * @description Интерфейс для модели из HTML парсинга
 * Структура данных модели, извлеченной с сайта Ollama
 */
export interface ParsedModel {
  /** Название модели */
  name: string;
  /** Описание модели */
  description?: string;
  /** Теги модели */
  tags: string[];
  /** Размер модели в байтах (приблизительный) */
  size?: number;
  /** Количество скачиваний */
  downloads?: number;
  /** Дата последнего обновления */
  lastUpdated?: string;
  /** Категория модели */
  category?: string;
}

/**
 * @description Интерфейс для результата парсинга
 * Результат операции парсинга HTML
 */
export interface ParseResult {
  /** Успешность операции */
  success: boolean;
  /** Извлеченные модели */
  models?: ParsedModel[];
  /** Ошибка при парсинге */
  error?: string;
}
