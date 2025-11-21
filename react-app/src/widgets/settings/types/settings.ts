/**
 * @module SettingsTypes
 * Типы для Settings.
 */

/**
 * Интерфейс для данных селектора в модальном окне.
 * Используется для унификации структуры данных в селекторах.
 */
export interface PopupSelectorData {
  [key: string]: string;
}

/**
 * Типы для формы настроек.
 */
export interface SettingsFormData {
  url: string;
  model: string;
  topK: string;
  similarityThreshold: string;
  chunkSize: string;
}
