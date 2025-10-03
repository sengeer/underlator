/**
 * @module UseTranslateButtonTypes
 * Типы для хука useTranslateButton.
 */

import { RefObject } from 'react';

/**
 * Алгебраический тип состояния кнопки перевода.
 * Использует дискриминируемое объединение для типобезопасного управления состояниями.
 * Следует принципам функционального программирования с алгебраическими типами.
 */
export type TranslateButtonState =
  /** Кнопка скрыта, не отображается */
  | { type: 'hidden' }
  /** Кнопка перевода видима с указанной позицией */
  | { type: 'translate'; position: { x: number; y: number } }
  /** Кнопка остановки видима с указанной позицией */
  | { type: 'stop'; position: { x: number; y: number } };

/**
 * Позиция кнопки перевода на экране.
 * Координаты относительно viewport с учетом прокрутки.
 */
export type TranslateButtonPosition = {
  /** Горизонтальная координата (пиксели) */
  x: number;
  /** Вертикальная координата (пиксели) */
  y: number;
};

/**
 * Конфигурация хука useTranslateButton.
 * Определяет параметры поведения кнопки перевода.
 */
export interface UseTranslateButtonConfig {
  /** Callback для обработки клика по кнопке перевода */
  onTranslate?: () => void;
  /** Callback для обработки клика по кнопке остановки */
  onStop?: () => void;
  /** Флаг состояния обработки (влияет на тип отображаемой кнопки) */
  isProcessing?: boolean;
  /** Смещение позиции кнопки относительно выделенного текста */
  positionOffset?: { x: number; y: number };
  /** Ссылка на контейнер для корректного позиционирования */
  containerRef?: RefObject<HTMLElement | null> | null;
}
