/**
 * @module SettingsConstants
 * Константы для Settings.
 */

import { providerSelectorEntries } from '../../../shared/models/provider-settings-slice/constants/provider-settings-slice';
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
 * Доступные провайдеры LLM — из общего каталога provider-settings.
 * Селектор/`switch(provider)` расширяются добавлением записи в каталог.
 */
export const PROVIDERS: PopupSelectorData = providerSelectorEntries();
