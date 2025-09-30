/**
 * @module SettingsConstants
 * Константы для Settings.
 */

import { PopupSelectorData } from '../types/settings';

/**
 * Доступные языки интерфейса.
 * Маппинг отображаемых названий на коды локалей.
 */
export const LANGUAGES: PopupSelectorData = {
  english: 'en',
  русский: 'ru',
};

/**
 * Доступные провайдеры LLM.
 * Маппинг отображаемых названий на идентификаторы провайдеров.
 */
export const PROVIDERS: PopupSelectorData = {
  Ollama: 'Ollama',
  'Embedded Ollama': 'Embedded Ollama',
};
