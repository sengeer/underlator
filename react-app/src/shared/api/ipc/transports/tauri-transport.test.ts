/**
 * @module TauriTransportTests
 */

import { describe, expect, it, vi } from 'vitest';
import { TAURI_COMMANDS, TAURI_EVENTS } from '../constants/tauri-transport';
import type { TauriBridge } from '../types/tauri-transport';
import { BackendError } from '../utils/errors';
import {
  TAURI_NAME_MAP,
  TauriTransport,
  parseTauriHostError,
  wrapRequest,
} from './tauri-transport';

function createBridge(overrides: Partial<TauriBridge> = {}): TauriBridge {
  return {
    invoke: async <T>(_command: string, _args?: unknown): Promise<T> => {
      return undefined as T;
    },
    listen: async () => () => undefined,
    ...overrides,
  };
}

describe('TauriTransport', () => {
  it('таблица имён совпадает с domain/contract.rs', () => {
    expect([...TAURI_COMMANDS]).toEqual([
      'model_generate',
      'model_stop',
      'model_install',
      'model_remove',
      'model_list',
      'catalog_get',
      'catalog_search',
      'catalog_get_model_info',
      'chat_create',
      'chat_get',
      'chat_update',
      'chat_delete',
      'chat_list',
      'chat_add_message',
    ]);
    expect([...TAURI_EVENTS]).toEqual([
      'model:generate-progress',
      'model:install-progress',
    ]);
    expect(TAURI_NAME_MAP.commands.generate).toBe('model_generate');
    expect(TAURI_NAME_MAP.commands.chatAddMessage).toBe('chat_add_message');
    expect(TAURI_NAME_MAP.events.generateProgress).toBe(
      'model:generate-progress'
    );
  });

  it('wrapRequest оборачивает DTO в { request }', () => {
    expect(wrapRequest({ name: 'llama' })).toEqual({
      request: { name: 'llama' },
    });
  });

  it('invoke передаёт { request } для install/catalog/chat', async () => {
    const invokeCalls: Array<{ command: string; args?: unknown }> = [];
    const bridge = createBridge({
      invoke: async <T>(command: string, args?: unknown): Promise<T> => {
        invokeCalls.push({ command, args });
        return { success: true } as T;
      },
    });
    const client = new TauriTransport(bridge);

    await client.model.install({ name: 'm' });
    expect(invokeCalls).toContainEqual({
      command: 'model_install',
      args: { request: { name: 'm' } },
    });

    await client.model.list({
      id: 'ollama',
      url: 'http://127.0.0.1:11434',
    });
    expect(invokeCalls).toContainEqual({
      command: 'model_list',
      args: { request: { id: 'ollama', url: 'http://127.0.0.1:11434' } },
    });

    await client.catalog.get({
      forceRefresh: true,
      id: 'ollama',
      url: 'http://127.0.0.1:11434',
    });
    expect(invokeCalls).toContainEqual({
      command: 'catalog_get',
      args: {
        request: {
          forceRefresh: true,
          id: 'ollama',
          url: 'http://127.0.0.1:11434',
        },
      },
    });

    await client.catalog.search({ search: 'q' });
    expect(invokeCalls).toContainEqual({
      command: 'catalog_search',
      args: { request: { search: 'q' } },
    });

    await client.chat.create({
      title: 't',
      defaultModel: { name: 'llama' },
    });
    expect(invokeCalls).toContainEqual({
      command: 'chat_create',
      args: { request: { title: 't', defaultModel: { name: 'llama' } } },
    });

    await client.model.generate({ model: 'm', prompt: 'p' });
    const generateCall = invokeCalls.find(
      (c) => c.command === 'model_generate'
    );
    expect(generateCall?.args).toEqual(
      expect.objectContaining({
        request: expect.objectContaining({
          model: 'm',
          prompt: 'p',
          id: 'ollama',
          url: 'http://127.0.0.1:11434',
        }),
      })
    );
  });

  it('classified host error → BackendError с классом', () => {
    const err = parseTauriHostError({
      class: 'not_found',
      message: 'chat missing',
    });
    expect(err).toBeInstanceOf(BackendError);
    expect(err.class).toBe('not_found');
    expect(err.message).toBe('chat missing');
  });

  it('invoke отсутствует → throw, fetch не вызывается', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const bridge = createBridge({
      invoke: async () => {
        throw new BackendError(
          'unsupported',
          "Tauri runtime недоступен: команда не реализована host'ом"
        );
      },
      listen: async () => {
        throw new BackendError('unsupported', 'listen unavailable');
      },
    });
    const client = new TauriTransport(bridge);
    await expect(
      client.model.generate({ model: 'm', prompt: 'p' })
    ).rejects.toBeInstanceOf(BackendError);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('default bridge без runtime не ходит в fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', {});
    const client = new TauriTransport();
    await expect(client.model.list()).rejects.toMatchObject({
      class: 'unsupported',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('listen доставляет payload progress', async () => {
    const handlers: Array<(payload: unknown) => void> = [];
    const bridge = createBridge({
      invoke: async <T>(): Promise<T> => 'ok' as T,
      listen: async (_event, handler) => {
        handlers.push(handler);
        return () => undefined;
      },
    });
    const client = new TauriTransport(bridge);
    const seen: unknown[] = [];
    client.model.onGenerateProgress((p) => seen.push(p));
    await Promise.resolve();
    handlers[0]?.({ response: 'tok', done: false });
    expect(seen).toEqual([{ response: 'tok', done: false }]);
  });
});
