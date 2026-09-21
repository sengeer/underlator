/**
 * @module BackendError
 * Ошибка клиента MVP: класс host + сообщение, без `IpcResponse`.
 */

import type { BackendErrorClass } from './types';

const KNOWN_CLASSES: readonly BackendErrorClass[] = [
  'invalid',
  'not_found',
  'cancelled',
  'unsupported',
  'provider',
  'http',
  'storage',
  'internal',
];

/**
 * Ошибка BackendClient. Поле `class` совпадает с JSON server 3.1.
 */
export class BackendError extends Error {
  /** Класс ошибки host (`not_found`, `cancelled`, …). */
  readonly class: BackendErrorClass;

  constructor(errorClass: BackendErrorClass, message: string) {
    super(message);
    this.name = 'BackendError';
    this.class = errorClass;
  }
}

/**
 * Нормализует строку класса; неизвестное значение → `internal`.
 */
export function normalizeErrorClass(value: string): BackendErrorClass {
  return KNOWN_CLASSES.includes(value as BackendErrorClass)
    ? (value as BackendErrorClass)
    : 'internal';
}

/**
 * Собирает BackendError из HTTP JSON `{ class, message }`.
 * Без класса (Electron) — `internal`.
 */
export function backendErrorFromBody(
  body: unknown,
  fallbackMessage: string
): BackendError {
  if (body && typeof body === 'object') {
    const record = body as { class?: unknown; message?: unknown };
    const message =
      typeof record.message === 'string' && record.message.length > 0
        ? record.message
        : fallbackMessage;
    if (typeof record.class === 'string' && record.class.length > 0) {
      return new BackendError(normalizeErrorClass(record.class), message);
    }
    return new BackendError('internal', message);
  }
  return new BackendError('internal', fallbackMessage);
}

/**
 * Разбор тела 4xx/5xx ответа в BackendError.
 */
export async function backendErrorFromResponse(
  response: Response
): Promise<BackendError> {
  const fallback = `HTTP ${response.status}`;
  const text = await response.text();
  if (!text) {
    return new BackendError('internal', fallback);
  }
  try {
    return backendErrorFromBody(JSON.parse(text), fallback);
  } catch {
    return new BackendError('internal', text || fallback);
  }
}

/**
 * Разворачивает Electron `IpcResponse` в DTO.
 * Строка generate (старый формат) возвращается как есть.
 */
export function unwrapIpcResponse<T>(response: unknown): T {
  if (typeof response === 'string') {
    return response as T;
  }
  if (isIpcEnvelope(response)) {
    if (!response.success) {
      throw backendErrorFromBody(
        { message: response.error },
        String(response.error ?? 'IPC operation failed')
      );
    }
    if ('data' in response) {
      return response.data as T;
    }
    return undefined as T;
  }
  return response as T;
}

function isIpcEnvelope(
  value: unknown
): value is { success: boolean; data?: unknown; error?: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  );
}
