/**
 * @module BackendErrorTests
 */

import { describe, expect, it } from 'vitest';
import { BackendError, backendErrorFromBody } from './errors';

describe('BackendError', () => {
  it('сохраняет class из HTTP-тела { class: "not_found" }', () => {
    const error = backendErrorFromBody(
      { class: 'not_found', message: 'chat missing' },
      'fallback'
    );
    expect(error).toBeInstanceOf(BackendError);
    expect(error.class).toBe('not_found');
    expect(error.message).toBe('chat missing');
  });

  it('Electron без класса мапится в internal', () => {
    const error = backendErrorFromBody({ message: 'IPC failed' }, 'IPC failed');
    expect(error.class).toBe('internal');
    expect(error.message).toBe('IPC failed');
  });
});
