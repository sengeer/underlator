/**
 * @module ElectronTransportTypes
 * Типы envelope Electron IPC (только внутри ElectronTransport).
 */

/** Envelope Electron IPC (`IpcResponse`) до unwrap в DTO. */
export interface IpcResponseEnvelope<T = unknown> {
  /** Успешность операции. */
  success: boolean;
  /** Тело DTO при успехе. */
  data?: T;
  /** Сообщение ошибки при `success: false`. */
  error?: string;
  /** Опциональный correlation id. */
  id?: string;
}
