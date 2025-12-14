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
 * Проверяет, является ли текущая сборка production и запущена ли она на macOS.
 * На macOS в production режиме провайдер Ollama отключается из-за ограничений Gatekeeper,
 * которые требуют платной подписки Apple Developer для использования локальной сети.
 *
 * @returns true, если это production сборка на macOS, иначе false.
 */
function isProductionMacOs(): boolean {
  const isProduction = import.meta.env.PROD;
  const isMacOS =
    typeof navigator !== 'undefined' &&
    (navigator.platform.includes('Mac') ||
      navigator.userAgent.includes('Mac OS X'));

  return isProduction && isMacOS;
}

/**
 * Доступные провайдеры LLM.
 * Маппинг отображаемых названий на идентификаторы провайдеров.
 *
 * На macOS в production режиме провайдер 'Ollama' исключается из списка
 * из-за ограничений Gatekeeper, которые требуют платной подписки Apple Developer
 * для использования локальной сети. Остается только 'Embedded Ollama'.
 */
export const PROVIDERS: PopupSelectorData = isProductionMacOs()
  ? {
      'Embedded Ollama': 'Embedded Ollama',
    }
  : {
      Ollama: 'Ollama',
      'Embedded Ollama': 'Embedded Ollama',
    };
