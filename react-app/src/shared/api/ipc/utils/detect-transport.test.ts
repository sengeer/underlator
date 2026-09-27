/**
 * @module DetectTransportTests
 */

import { describe, expect, it } from 'vitest';
import { detectTransport } from './detect-transport';

describe('detectTransport', () => {
  it('явный http побеждает при наличии window.electron', () => {
    expect(detectTransport('http', { electron: { model: {} } })).toBe('http');
  });

  it('detect electron без флага и без Tauri', () => {
    expect(detectTransport('', { electron: { model: {} } })).toBe('electron');
    expect(detectTransport(undefined, { electron: { model: {} } })).toBe(
      'electron'
    );
  });

  it('default без host — http', () => {
    expect(detectTransport('', {})).toBe('http');
    expect(detectTransport(undefined, {})).toBe('http');
  });

  it('Tauri global побеждает electron при пустом флаге', () => {
    expect(
      detectTransport('', {
        __TAURI_INTERNALS__: {},
        electron: { model: {} },
      })
    ).toBe('tauri');
    expect(detectTransport('', { __TAURI__: {} })).toBe('tauri');
  });
});
