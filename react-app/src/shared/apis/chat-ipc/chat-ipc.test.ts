/**
 * @module ChatIpcFacadeTests
 * catch BackendError → ChatOperationResult.success = false.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '../../api';

const createMock = vi.fn();

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return {
    ...actual,
    getBackendClient: () => ({
      chat: {
        create: createMock,
        get: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
        addMessage: vi.fn(),
      },
    }),
  };
});

describe('chat-ipc facade', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('не содержит window.electron.chat и ловит BackendError как success: false', async () => {
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./chat-ipc.ts', import.meta.url), 'utf8')
    );
    expect(source).not.toMatch(/window\.electron\.chat/);

    createMock.mockRejectedValueOnce(
      new BackendError('not_found', 'chat missing')
    );
    const { default: chatIpc } = await import('./chat-ipc');
    const result = await chatIpc.createChat({
      title: 'x',
      defaultModel: { name: 'llama' },
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('chat missing');
  });
});
