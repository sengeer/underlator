/**
 * @vitest-environment happy-dom
 * @module UseProgressiveRevealTest
 */

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useProgressiveReveal from './use-progressive-reveal';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const frames: FrameRequestCallback[] = [];

function installFrameStub(): void {
  vi.stubGlobal(
    'requestAnimationFrame',
    (callback: FrameRequestCallback): number => {
      frames.push(callback);
      return frames.length;
    }
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    frames[id - 1] = () => undefined;
  });
  vi.stubGlobal('requestIdleCallback', undefined);
  vi.stubGlobal('cancelIdleCallback', undefined);
}

function flushFrame(): void {
  const batch = frames.splice(0, frames.length);
  act(() => {
    batch.forEach((callback) => {
      callback(0);
    });
  });
}

function Probe({
  items,
  open,
  onPrefix,
}: {
  items: readonly number[];
  open: boolean;
  onPrefix: (prefix: readonly number[]) => void;
}) {
  const { prefix } = useProgressiveReveal({
    items,
    open,
    chunkSize: 20,
    defer: 'frame',
  });
  useEffect(() => {
    onPrefix(prefix);
  });
  return null;
}

describe('useProgressiveReveal', () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
    frames.length = 0;
    vi.unstubAllGlobals();
  });

  function mount(
    items: readonly number[],
    open: boolean
  ): {
    prefix: () => readonly number[];
    rerender: (nextItems: readonly number[], nextOpen: boolean) => void;
  } {
    installFrameStub();
    let latest: readonly number[] = [];
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    const render = (nextItems: readonly number[], nextOpen: boolean) => {
      act(() => {
        root?.render(
          createElement(Probe, {
            items: nextItems,
            open: nextOpen,
            onPrefix: (prefix) => {
              latest = prefix;
            },
          })
        );
      });
    };
    render(items, open);
    return {
      prefix: () => latest,
      rerender: render,
    };
  }

  it('наращивает префикс порциями', () => {
    const items = Array.from({ length: 50 }, (_, index) => index);
    const view = mount(items, true);

    expect(view.prefix()).toEqual([]);

    flushFrame();
    expect(view.prefix()).toEqual(items.slice(0, 20));

    flushFrame();
    expect(view.prefix()).toEqual(items.slice(0, 40));

    flushFrame();
    expect(view.prefix()).toEqual(items);
  });

  it('при закрытии префикс пуст', () => {
    const items = Array.from({ length: 30 }, (_, index) => index);
    const view = mount(items, true);
    flushFrame();
    expect(view.prefix().length).toBe(20);

    view.rerender(items, false);
    expect(view.prefix()).toEqual([]);
  });

  it('смена списка сбрасывает префикс', () => {
    const items = Array.from({ length: 40 }, (_, index) => index);
    const view = mount(items, true);
    flushFrame();
    expect(view.prefix()).toEqual(items.slice(0, 20));

    const nextItems = items.map((item) => item + 100);
    view.rerender(nextItems, true);
    expect(view.prefix()).toEqual([]);

    flushFrame();
    expect(view.prefix()).toEqual(nextItems.slice(0, 20));
  });
});
