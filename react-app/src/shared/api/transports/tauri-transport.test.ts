/**
 * @module TauriTransportTests
 */

import { describe, expect, it, vi } from 'vitest';
import { BackendError } from '../errors';
import { TAURI_COMMANDS, TAURI_EVENTS } from '../types';
import {
  TAURI_NAME_MAP,
  TauriTransport,
  type TauriBridge,
} from './tauri-transport';

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

  it('invoke отсутствует → throw, fetch не вызывается', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const bridge: TauriBridge = {
      invoke: async () => {
        throw new BackendError(
          'unsupported',
          "Tauri runtime недоступен: команда не реализована host'ом"
        );
      },
      listen: async () => {
        throw new BackendError('unsupported', 'listen unavailable');
      },
    };
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
});
