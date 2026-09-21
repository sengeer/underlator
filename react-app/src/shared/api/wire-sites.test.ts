/**
 * @module WireSitesTests
 * Call sites MVP ходят в BackendClient, не в window.electron.model|catalog|chat.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '../..');

function read(rel: string): string {
  return readFileSync(join(src, rel), 'utf8');
}

describe('wiring call sites', () => {
  it('feature-provider использует BackendClient, не model-ipc и не window.electron.model', () => {
    const source = read('shared/lib/hooks/use-model/feature-provider.ts');
    expect(source).toMatch(/getBackendClient/);
    expect(source).not.toMatch(/window\.electron\.model/);
    expect(source).not.toMatch(/apis\/model-ipc/);
    expect(source).not.toMatch(/from ['"]\.\/apis\/model-ipc/);
  });

  it('use-model.stop не вызывает window.electron.model.stop', () => {
    const source = read('shared/lib/hooks/use-model/use-model.ts');
    expect(source).toMatch(/getBackendClient/);
    expect(source).not.toMatch(/window\.electron\.model\.stop/);
    expect(source).not.toMatch(/window\.electron\.model/);
  });

  it('settings catalog/model не вызывает window.electron.model|catalog', () => {
    const source = read('widgets/settings/apis/model-and-catalog-ipc.ts');
    expect(source).toMatch(/getBackendClient/);
    expect(source).not.toMatch(/window\.electron\.model/);
    expect(source).not.toMatch(/window\.electron\.catalog/);
  });

  it('rag-ipc и splash остаются на Electron без BackendClient', () => {
    const rag = read('shared/apis/rag-ipc/rag-ipc.ts');
    const splash = read('pages/main/apis/splash-screen-ipc.ts');
    expect(rag).toMatch(/electron\.rag/);
    expect(rag).not.toMatch(/getBackendClient/);
    expect(splash).toMatch(/electron\?\.splash|electron\.splash/);
    expect(splash).not.toMatch(/getBackendClient/);
  });
});
