/**
 * @module BackendErrorTypes
 * Типы классификации ошибок host для BackendClient.
 */

/** Класс ошибки host (как JSON `{ class }` server 3.1). */
export type BackendErrorClass =
  | 'invalid'
  | 'not_found'
  | 'cancelled'
  | 'unsupported'
  | 'provider'
  | 'http'
  | 'storage'
  | 'internal';
