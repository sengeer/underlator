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
 * Типы для переводов меню.
 */
export interface MenuTranslations {
  MENU?: string;
  ABOUT?: string;
  UNDO?: string;
  REDO?: string;
  CUT?: string;
  COPY?: string;
  PASTE?: string;
  SELECT_ALL?: string;
  QUIT?: string;
  DOWNLOADING_OLLAMA?: string;
  LOADING_APP?: string;
  GETTING_CATALOG?: string;
  GB?: string;
  OK?: string;
  RAM?: string;
  INSUFFICIENT_RAM?: string;
}
