/**
 * @module ElectronTypes
 * Общие типы Electron приложения.
 */

/**
 * Конфигурация для API Electron.
 */
export interface ElectronApiConfig {
  /** Идентификатор провайдера */
  id: string;
  /** URL провайдера */
  url: string;
}

/**
 * Тип для перевода приложения.
 */
export type AppTranslations = Record<string, string>;
