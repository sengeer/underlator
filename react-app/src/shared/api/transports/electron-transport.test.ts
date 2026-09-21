/**
 * @module ElectronTransportTests
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '../errors';
import { ElectronTransport } from './electron-transport';

type ProgressCb = (payload: unknown) => void;

function mockElectron(
  overrides: {
    generate?: () => Promise<unknown>;
    stop?: () => Promise<unknown>;
    onGenerateProgress?: (cb: ProgressCb) => () => void;
    onInstallProgress?: (cb: ProgressCb) => () => void;
  } = {}
) {
  const generate =
    overrides.generate ?? (async () => ({ success: true, data: 'hello' }));
  const stop = overrides.stop ?? (async () => ({ success: true }));
  const onGenerateProgress =
    overrides.onGenerateProgress ?? ((_cb: ProgressCb) => () => undefined);
  const onInstallProgress =
    overrides.onInstallProgress ?? ((_cb: ProgressCb) => () => undefined);

  const electron = {
    model: {
      generate,
      stop,
      install: async () => ({ success: true, data: { success: true } }),
      remove: async () => ({ success: true, data: { success: true } }),
      list: async () => ({ success: true, data: { models: [] } }),
      onGenerateProgress,
      onInstallProgress,
    },
    catalog: {
      get: async () => ({ success: true, data: { ollama: [] } }),
      search: async () => ({ success: true, data: { ollama: [] } }),
      getModelInfo: async () => ({ success: true, data: null }),
    },
    chat: {
      create: async () => ({ success: true, data: { id: 'c1' } }),
      get: async () => ({ success: true, data: { id: 'c1' } }),
      update: async () => ({ success: true, data: { id: 'c1' } }),
      delete: async () => ({
        success: true,
        data: { deletedChatId: 'c1' },
      }),
      list: async () => ({ success: true, data: { chats: [] } }),
      addMessage: async () => ({
        success: true,
        data: { message: { id: 'm1' } },
      }),
    },
  };

  vi.stubGlobal('window', { electron });
  return electron;
}

describe('ElectronTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('unwrap { success: true, data: "hello" } → "hello"', async () => {
    mockElectron();
    const client = new ElectronTransport();
    await expect(
      client.model.generate({ model: 'm', prompt: 'p' })
    ).resolves.toBe('hello');
  });

  it('success: false → throw BackendError', async () => {
    mockElectron({
      generate: async () => ({ success: false, error: 'boom' }),
    });
    const client = new ElectronTransport();
    await expect(
      client.model.generate({ model: 'm', prompt: 'p' })
    ).rejects.toMatchObject({
      class: 'internal',
      message: 'boom',
    });
  });

  it('callback прогресса вызывается и unsubscribe снимает слушатель', () => {
    let stored: ProgressCb | undefined;
    mockElectron({
      onGenerateProgress: (cb) => {
        stored = cb;
        return () => {
          stored = undefined;
        };
      },
    });
    const client = new ElectronTransport();
    const callback = vi.fn();
    const unsubscribe = client.model.onGenerateProgress(callback);
    stored?.({ model: 'm', response: 'x', created_at: 't', done: false });
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
    stored?.({ model: 'm', response: 'y', created_at: 't', done: false });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('нет window.electron → ошибка и нет fetch на /api/*', async () => {
    vi.stubGlobal('window', {});
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const client = new ElectronTransport();
    await expect(
      client.model.generate({ model: 'm', prompt: 'p' })
    ).rejects.toBeInstanceOf(BackendError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('/api/'))
    ).toBe(false);
  });
});
