/**
 * @module HttpTransportTests
 */

import { describe, expect, it, vi, type Mock } from 'vitest';
import { BackendError } from '../errors';
import { HttpTransport } from './http-transport';

type FetchMock = Mock<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sseBody(frames: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(frames));
      controller.close();
    },
  });
}

function sseResponse(frames: string): Response {
  return new Response(sseBody(frames), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function hangingSseResponse(signal?: AbortSignal): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      signal?.addEventListener('abort', () => {
        try {
          controller.error(new DOMException('Aborted', 'AbortError'));
        } catch {
          /* already closed */
        }
      });
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function callUrl(fetchMock: FetchMock, index: number): string {
  const call = fetchMock.mock.calls[index];
  if (!call) {
    throw new Error(`нет fetch-вызова #${index}`);
  }
  return String(call[0]);
}

function callInit(fetchMock: FetchMock, index: number): RequestInit {
  const call = fetchMock.mock.calls[index];
  if (!call) {
    throw new Error(`нет fetch-вызова #${index}`);
  }
  return call[1] ?? {};
}

function createFetchMock(
  impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
): FetchMock {
  return vi.fn(impl);
}

describe('HttpTransport unary REST', () => {
  it('GET /api/model/list, GET /api/catalog, POST /api/chat, getModelInfo null', async () => {
    const fetchMock = createFetchMock(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/model/list')) {
        return jsonResponse({
          models: [{ name: 'llama', size: 1, modified_at: 't' }],
        });
      }
      if (url.includes('/api/catalog/models/')) {
        return jsonResponse(null);
      }
      if (url.includes('/api/catalog')) {
        return jsonResponse({
          ollama: [],
          totalCount: 0,
          lastUpdated: 't',
        });
      }
      if (url.endsWith('/api/chat')) {
        return jsonResponse({
          id: 'c1',
          title: 'Чат',
          messages: [],
          createdAt: 't',
          updatedAt: 't',
          defaultModel: { name: 'llama' },
        });
      }
      throw new Error(`unexpected ${url}`);
    });

    const client = new HttpTransport({ fetch: fetchMock as typeof fetch });

    const listed = await client.model.list();
    expect(listed.models[0]?.name).toBe('llama');
    expect(callUrl(fetchMock, 0)).toBe('/api/model/list');
    expect(callInit(fetchMock, 0).method).toBe('GET');

    const catalog = await client.catalog.get({ forceRefresh: true });
    expect(catalog.totalCount).toBe(0);
    expect(callUrl(fetchMock, 1)).toBe('/api/catalog?forceRefresh=true');

    const chat = await client.chat.create({
      title: 'Чат',
      defaultModel: { name: 'llama' },
    });
    expect(chat.id).toBe('c1');
    expect(callUrl(fetchMock, 2)).toBe('/api/chat');
    expect(callInit(fetchMock, 2).method).toBe('POST');

    const info = await client.catalog.getModelInfo({
      modelName: 'qwen/7b',
    });
    expect(info).toBeNull();
    expect(callUrl(fetchMock, 3)).toBe('/api/catalog/models/qwen%2F7b');
  });

  it('list/install/catalog передают id/url из settings', async () => {
    const fetchMock = createFetchMock(async (input, init) => {
      const url = String(input);
      if (url.startsWith('/api/model/list')) {
        return jsonResponse({ models: [] });
      }
      if (url.startsWith('/api/model/install')) {
        return sseResponse('event: result\ndata: {"success":true}\n\n');
      }
      if (url.startsWith('/api/model/remove')) {
        return jsonResponse({ success: true });
      }
      if (url.startsWith('/api/catalog')) {
        return jsonResponse({
          ollama: [],
          totalCount: 0,
          lastUpdated: 't',
        });
      }
      throw new Error(`unexpected ${url} ${init?.method}`);
    });

    const client = new HttpTransport({ fetch: fetchMock as typeof fetch });
    const provider = {
      id: 'ollama',
      url: 'http://127.0.0.1:11434',
    };

    await client.model.list(provider);
    expect(callUrl(fetchMock, 0)).toBe(
      '/api/model/list?id=ollama&url=http%3A%2F%2F127.0.0.1%3A11434'
    );

    await client.model.install({ name: 'llama', ...provider });
    expect(JSON.parse(String(callInit(fetchMock, 1).body))).toMatchObject(
      provider
    );

    await client.model.remove({ name: 'llama', ...provider });
    expect(JSON.parse(String(callInit(fetchMock, 2).body))).toMatchObject(
      provider
    );

    await client.catalog.get({ forceRefresh: true, ...provider });
    expect(callUrl(fetchMock, 3)).toContain('id=ollama');
    expect(callUrl(fetchMock, 3)).toContain(
      'url=http%3A%2F%2F127.0.0.1%3A11434'
    );
  });

  it('merge config.id/url в тело generate', async () => {
    const fetchMock = createFetchMock(async () =>
      sseResponse('event: result\ndata: "ok"\n\n')
    );
    const client = new HttpTransport({ fetch: fetchMock as typeof fetch });
    await client.model.generate(
      { model: 'm', prompt: 'p' },
      { id: 'embedded', url: 'http://127.0.0.1:11435' }
    );
    expect(JSON.parse(String(callInit(fetchMock, 0).body))).toMatchObject({
      model: 'm',
      prompt: 'p',
      id: 'embedded',
      url: 'http://127.0.0.1:11435',
    });
  });

  it('2xx stop при теле null — успех', async () => {
    const fetchMock = createFetchMock(async () => jsonResponse(null));
    const client = new HttpTransport({ fetch: fetchMock as typeof fetch });
    await expect(client.model.stop()).resolves.toBeUndefined();
    expect(callUrl(fetchMock, 0)).toBe('/api/model/stop');
    expect(callInit(fetchMock, 0).method).toBe('POST');
  });
});

describe('HttpTransport SSE', () => {
  it('два кадра generate-progress + result → слушатели и финальный текст', async () => {
    const frames = [
      'event: model:generate-progress',
      'data: {"model":"m","response":"Hel","created_at":"t","done":false}',
      '',
      'event: model:generate-progress',
      'data: {"model":"m","response":"lo","created_at":"t","done":false}',
      '',
      'event: result',
      'data: "Hello"',
      '',
    ].join('\n');
    const fetchMock = createFetchMock(async () => sseResponse(frames));
    const client = new HttpTransport({ fetch: fetchMock as typeof fetch });
    const chunks: string[] = [];
    const unsubscribe = client.model.onGenerateProgress((progress) => {
      chunks.push(progress.response);
    });
    const text = await client.model.generate({
      model: 'm',
      prompt: 'p',
    });
    unsubscribe();
    expect(chunks).toEqual(['Hel', 'lo']);
    expect(text).toBe('Hello');
    expect(callUrl(fetchMock, 0)).toBe('/api/model/generate');
    expect(callInit(fetchMock, 0).headers).toMatchObject({
      Accept: 'text/event-stream',
    });
  });

  it('SSE install: status кадры и result { success: true }', async () => {
    const frames = [
      'event: model:install-progress',
      'data: {"status":"downloading","name":"llama"}',
      '',
      'event: result',
      'data: {"success":true}',
      '',
    ].join('\n');
    const fetchMock = createFetchMock(async () => sseResponse(frames));
    const client = new HttpTransport({ fetch: fetchMock as typeof fetch });
    const statuses: string[] = [];
    client.model.onInstallProgress((progress) => {
      statuses.push(progress.status);
    });
    const result = await client.model.install({ name: 'llama' });
    expect(statuses).toEqual(['downloading']);
    expect(result).toEqual({ success: true });
  });

  it('404 { class: not_found } сохраняет класс', async () => {
    const fetchMock = createFetchMock(async () =>
      jsonResponse({ class: 'not_found', message: 'нет' }, 404)
    );
    const client = new HttpTransport({ fetch: fetchMock as typeof fetch });
    await expect(client.model.list()).rejects.toMatchObject({
      class: 'not_found',
      message: 'нет',
    });
  });

  it('close без result → throw, не пустая успешная строка', async () => {
    const frames = [
      'event: model:generate-progress',
      'data: {"model":"m","response":"x","created_at":"t","done":false}',
      '',
    ].join('\n');
    const fetchMock = createFetchMock(async () => sseResponse(frames));
    const client = new HttpTransport({ fetch: fetchMock as typeof fetch });
    await expect(
      client.model.generate({ model: 'm', prompt: 'p' })
    ).rejects.toBeInstanceOf(BackendError);
  });

  it('stop во время generate вызывает /api/model/stop и прерывает поток', async () => {
    const fetchMock = createFetchMock(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/api/model/generate')) {
        return hangingSseResponse(init?.signal ?? undefined);
      }
      if (url.endsWith('/api/model/stop')) {
        return jsonResponse(null);
      }
      throw new Error(`unexpected ${url}`);
    });
    const client = new HttpTransport({ fetch: fetchMock as typeof fetch });
    const generatePromise = client.model.generate({
      model: 'm',
      prompt: 'p',
    });
    await vi.waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).endsWith('/api/model/generate')
        )
      ).toBe(true);
    });
    await client.model.stop();
    await expect(generatePromise).rejects.toBeInstanceOf(BackendError);
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toContain('/api/model/generate');
    expect(urls).toContain('/api/model/stop');
  });
});

describe('HttpTransport auth and relative URL', () => {
  it('с токеном заголовок есть, без токена — нет; URL относительный', async () => {
    const withToken = createFetchMock(async () => jsonResponse({ models: [] }));
    const clientWithToken = new HttpTransport({
      fetch: withToken as typeof fetch,
      token: 'secret',
    });
    await clientWithToken.model.list();
    expect(callUrl(withToken, 0)).toBe('/api/model/list');
    expect(callInit(withToken, 0).headers).toMatchObject({
      Authorization: 'Bearer secret',
    });

    const withoutToken = createFetchMock(async () =>
      jsonResponse({ models: [] })
    );
    const clientWithoutToken = new HttpTransport({
      fetch: withoutToken as typeof fetch,
      token: '',
    });
    await clientWithoutToken.model.list();
    const headers = callInit(withoutToken, 0).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
