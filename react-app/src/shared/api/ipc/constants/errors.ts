/**
 * @module BackendErrorConstants
 * Известные классы ошибок host для нормализации BackendError.
 */

import type { BackendErrorClass } from '../types/errors';

/** Допустимые значения `class` из JSON server 3.1. */
export const KNOWN_ERROR_CLASSES: readonly BackendErrorClass[] = [
  'invalid',
  'not_found',
  'cancelled',
  'unsupported',
  'provider',
  'http',
  'storage',
  'internal',
];
