/**
 * @module TauriTransportConstants
 * Имена Tauri commands/events и defaults провайдера для generate.
 */

/** Идентификатор провайдера по умолчанию (Ollama). */
export const DEFAULT_PROVIDER_ID = 'ollama';

/** Base URL провайдера по умолчанию. */
export const DEFAULT_PROVIDER_URL = 'http://127.0.0.1:11434';

/** Имена Tauri commands из `domain/contract.rs`. */
export const TAURI_COMMANDS = [
  'model_generate',
  'model_stop',
  'model_install',
  'model_remove',
  'model_list',
  'catalog_get',
  'catalog_search',
  'catalog_get_model_info',
  'chat_create',
  'chat_get',
  'chat_update',
  'chat_delete',
  'chat_list',
  'chat_add_message',
] as const;

/** IPC-имена progress-событий ядра. */
export const TAURI_EVENTS = [
  'model:generate-progress',
  'model:install-progress',
] as const;
