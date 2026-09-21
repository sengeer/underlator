/**
 * @module PublicApiIndexTests
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as api from './index';

const here = dirname(fileURLToPath(import.meta.url));

describe('shared/api public index', () => {
  it('экспортирует getBackendClient, типы и BackendError без transports/', () => {
    expect(typeof api.getBackendClient).toBe('function');
    expect(api.BackendError).toBeDefined();
    expect('HttpTransport' in api).toBe(false);
    expect('ElectronTransport' in api).toBe(false);
    expect('TauriTransport' in api).toBe(false);

    const source = readFileSync(join(here, 'index.ts'), 'utf8');
    expect(source).not.toMatch(/transports\//);
    expect(source).toMatch(/getBackendClient/);
    expect(source).toMatch(/BackendError/);
  });
});
