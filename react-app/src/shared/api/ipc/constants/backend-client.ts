/**
 * @module BackendClientConstants
 * Карта имён методов MVP для контракта BackendClient.
 */

/** 14 операций MVP model + 2 подписки на прогресс. */
export const MVP_MODEL_METHODS = [
  'generate',
  'stop',
  'install',
  'remove',
  'list',
  'onGenerateProgress',
  'onInstallProgress',
] as const;

/** Методы фасада `catalog`. */
export const MVP_CATALOG_METHODS = ['get', 'search', 'getModelInfo'] as const;

/** Методы фасада `chat`. */
export const MVP_CHAT_METHODS = [
  'create',
  'get',
  'update',
  'delete',
  'list',
  'addMessage',
] as const;
