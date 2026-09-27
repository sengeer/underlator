/**
 * @module HttpTransportTypes
 * Типы опций HTTP-транспорта BackendClient.
 */

/** Опции конструктора HttpTransport. */
export interface HttpTransportOptions {
  /** Base URL без trailing slash. Пусто = relative `/api/...`. */
  baseUrl?: string;
  /** Bearer-токен для `/api/*`. */
  token?: string;
  /** Инъекция fetch (тесты). */
  fetch?: typeof fetch;
}
