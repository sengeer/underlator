/**
 * @module SseParser
 * Инкрементальный разбор `text/event-stream` из ReadableStream (не EventSource).
 */

import type { SseFrame } from '../types/sse';

export type { SseFrame };

/**
 * Читает кадры SSE из потока. O(n) по байтам: хвост буфера не копируется
 * целиком на каждый chunk сверх необходимого slice.
 *
 * @param stream - Тело HTTP-ответа `text/event-stream`.
 * @param signal - Опциональный AbortSignal для отмены чтения.
 * @yields Полные SSE-кадры.
 */
export async function* readSseFrames(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<SseFrame> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const abortError = (): Error =>
    signal?.reason instanceof Error
      ? signal.reason
      : new DOMException('Aborted', 'AbortError');

  const throwIfAborted = (): void => {
    if (signal?.aborted) {
      throw abortError();
    }
  };

  const onAbort = (): void => {
    void reader.cancel(abortError());
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    while (true) {
      throwIfAborted();
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const extracted = extractCompleteFrames(buffer);
      buffer = extracted.rest;
      for (const frame of extracted.frames) {
        yield frame;
      }
    }
    buffer += decoder.decode();
    const tail = parseFrameBlock(buffer);
    if (tail) {
      yield tail;
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }
}

/**
 * Вырезает завершённые кадры из буфера (разделитель `\n\n`).
 *
 * @param buffer - Накопленный текст SSE.
 * @returns Кадры и остаток буфера.
 */
function extractCompleteFrames(buffer: string): {
  frames: SseFrame[];
  rest: string;
} {
  const frames: SseFrame[] = [];
  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let rest = normalized;
  let separator = rest.indexOf('\n\n');
  while (separator !== -1) {
    const block = rest.slice(0, separator);
    rest = rest.slice(separator + 2);
    const frame = parseFrameBlock(block);
    if (frame) {
      frames.push(frame);
    }
    separator = rest.indexOf('\n\n');
  }
  return { frames, rest };
}

/**
 * Разбирает один блок SSE в кадр.
 *
 * @param block - Текст между разделителями кадров.
 * @returns Кадр или `null` для пустого/комментария.
 */
function parseFrameBlock(block: string): SseFrame | null {
  if (!block.trim()) {
    return null;
  }
  let event = 'message';
  const dataLines: string[] = [];
  const lines = block.split('\n');
  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      let value = line.slice('data:'.length);
      if (value.startsWith(' ')) {
        value = value.slice(1);
      }
      dataLines.push(value);
    }
  }
  if (dataLines.length === 0 && event === 'message') {
    return null;
  }
  return { event, data: dataLines.join('\n') };
}

/**
 * Разбирает JSON из поля data кадра. Невалидный JSON → сырая строка.
 *
 * @param raw - Содержимое `data:` кадра.
 * @returns Объект JSON или исходная строка.
 */
export function parseSseData(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
