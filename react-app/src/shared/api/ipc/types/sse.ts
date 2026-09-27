/**
 * @module SseParserTypes
 * Типы инкрементального разбора `text/event-stream`.
 */

/** Один SSE-кадр: имя события + сырые data-строки. */
export interface SseFrame {
  /** Имя события (`message`, `result`, progress-имена ядра). */
  event: string;
  /** Склеенные строки `data:` кадра. */
  data: string;
}
