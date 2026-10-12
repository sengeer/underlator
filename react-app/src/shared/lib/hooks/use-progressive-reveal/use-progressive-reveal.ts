/**
 * @module UseProgressiveReveal
 * Порционное раскрытие длинного списка после открытия оболочки.
 */

import { isValidElement, useEffect, useRef, useState } from 'react';
import type {
  UseProgressiveRevealOptions,
  UseProgressiveRevealResult,
} from './types/use-progressive-reveal';

const DEFAULT_CHUNK_SIZE = 20;
const DEFAULT_FALLBACK_MS = 280;

/**
 * Стабильный ключ списка: ключи React-элементов или значения примитивов.
 * Новый массив с теми же ключами не считается сменой списка.
 */
export function listIdentity<T>(
  items: readonly T[],
  getItemKey?: (item: T, index: number) => string
): string {
  const parts = new Array<string>(items.length);
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (getItemKey) {
      parts[index] = getItemKey(item, index);
    } else if (isValidElement(item)) {
      parts[index] = item.key == null ? `#${index}` : String(item.key);
    } else {
      parts[index] = `${typeof item}:${String(item)}`;
    }
  }
  return parts.join('\0');
}

/**
 * Анимация корня ещё идёт: есть running-анимация или opacity не дошла до 1.
 */
function transitionStillRunning(element: HTMLElement): boolean {
  if (typeof element.getAnimations === 'function') {
    const animations = element.getAnimations();
    if (animations.length > 0) {
      return animations.some((animation) => animation.playState === 'running');
    }
  }
  if (typeof window.getComputedStyle !== 'function') {
    return true;
  }
  return window.getComputedStyle(element).opacity !== '1';
}

function scheduleOnNextFrame(callback: () => void): () => void {
  const id = requestAnimationFrame(() => {
    callback();
  });
  return () => cancelAnimationFrame(id);
}

/**
 * Следующая порция: idle, если он есть, иначе следующий кадр.
 */
function scheduleNextChunk(callback: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(
      () => {
        callback();
      },
      { timeout: 50 }
    );
    return () => cancelIdleCallback(id);
  }
  return scheduleOnNextFrame(callback);
}

/**
 * Раскрывает список порциями.
 * Пока `open` ложен, префикс пуст. Смена состава списка сбрасывает префикс.
 * Оболочка (`shellReady`) готова сразу при открытии, до первой порции.
 */
function useProgressiveReveal<T>({
  items,
  open,
  chunkSize = DEFAULT_CHUNK_SIZE,
  initialCount = 0,
  getItemKey,
  resetKey,
  defer = 'frame',
  targetRef,
  fallbackMs = DEFAULT_FALLBACK_MS,
}: UseProgressiveRevealOptions<T>): UseProgressiveRevealResult<T> {
  const size = Math.max(1, chunkSize);
  const lead = open ? Math.min(items.length, Math.max(0, initialCount)) : 0;
  const listKey = resetKey ?? listIdentity(items, getItemKey);
  const [visibleCount, setVisibleCount] = useState(lead);
  const [trackedKey, setTrackedKey] = useState(listKey);
  const [trackedOpen, setTrackedOpen] = useState(open);
  const lengthRef = useRef(items.length);

  if (trackedKey !== listKey || trackedOpen !== open) {
    setTrackedKey(listKey);
    setTrackedOpen(open);
    setVisibleCount(lead);
  } else if (
    resetKey !== undefined &&
    visibleCount >= lengthRef.current &&
    items.length > lengthRef.current
  ) {
    setVisibleCount(items.length);
  }
  lengthRef.current = items.length;

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const countRef = useRef(0);
  countRef.current = visibleCount;

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    let cancelPending: (() => void) | null = null;
    let timeoutId = 0;
    let removeTransition: (() => void) | null = null;

    const clearPending = () => {
      cancelPending?.();
      cancelPending = null;
    };

    const pump = () => {
      if (cancelled) {
        return;
      }
      const total = itemsRef.current.length;
      const next = Math.min(total, countRef.current + size);
      if (next === countRef.current) {
        return;
      }
      countRef.current = next;
      setVisibleCount(next);
      if (next < total) {
        clearPending();
        cancelPending = scheduleNextChunk(pump);
      }
    };

    if (defer === 'frame') {
      cancelPending = scheduleOnNextFrame(pump);
    } else {
      const element = targetRef?.current ?? null;
      let started = false;
      const fire = () => {
        if (started || cancelled) {
          return;
        }
        started = true;
        window.clearTimeout(timeoutId);
        removeTransition?.();
        pump();
      };
      if (element && transitionStillRunning(element)) {
        const onEnd = (event: Event) => {
          if (event.target !== element) {
            return;
          }
          fire();
        };
        element.addEventListener('transitionend', onEnd);
        removeTransition = () => {
          element.removeEventListener('transitionend', onEnd);
        };
        timeoutId = window.setTimeout(fire, fallbackMs);
      } else if (element) {
        cancelPending = scheduleOnNextFrame(pump);
      } else {
        timeoutId = window.setTimeout(fire, fallbackMs);
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      removeTransition?.();
      clearPending();
    };
  }, [open, listKey, defer, size, fallbackMs, targetRef]);

  return {
    prefix: open ? items.slice(0, visibleCount) : [],
    shellReady: open,
  };
}

export default useProgressiveReveal;
