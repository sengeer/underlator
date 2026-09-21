/**
 * @module BackendClientTests
 * Контракт MVP и singleton getBackendClient.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { BackendClient } from './backend-client';
import {
  getBackendClient,
  resetBackendClientForTests,
} from './create-backend-client';
import { HttpTransport } from './transports/http-transport';
import {
  MVP_CATALOG_METHODS,
  MVP_CHAT_METHODS,
  MVP_MODEL_METHODS,
} from './types';

describe('BackendClient contract', () => {
  it('набор методов совпадает с картой MVP без rag/splash', () => {
    const client: BackendClient = new HttpTransport({
      fetch: (async () => new Response('null')) as typeof fetch,
    });

    expect(Object.keys(client.model).sort()).toEqual(
      [...MVP_MODEL_METHODS].sort()
    );
    expect(Object.keys(client.catalog).sort()).toEqual(
      [...MVP_CATALOG_METHODS].sort()
    );
    expect(Object.keys(client.chat).sort()).toEqual(
      [...MVP_CHAT_METHODS].sort()
    );

    expect(MVP_MODEL_METHODS).toHaveLength(7);
    expect(MVP_CATALOG_METHODS).toHaveLength(3);
    expect(MVP_CHAT_METHODS).toHaveLength(6);
    expect(
      MVP_MODEL_METHODS.filter((name) => !name.startsWith('on'))
    ).toHaveLength(5);

    const all = [
      ...Object.keys(client.model),
      ...Object.keys(client.catalog),
      ...Object.keys(client.chat),
    ].join(',');
    expect(all).not.toMatch(/rag/i);
    expect(all).not.toMatch(/splash/i);
  });
});

describe('getBackendClient', () => {
  afterEach(() => {
    resetBackendClientForTests();
  });

  it('повторный вызов возвращает тот же экземпляр', () => {
    const first = getBackendClient();
    const second = getBackendClient();
    expect(second).toBe(first);
  });
});
