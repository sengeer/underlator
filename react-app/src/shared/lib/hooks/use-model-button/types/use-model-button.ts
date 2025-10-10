/**
 * @module UseModelButtonTypes
 * Типы для хука useTranslateButton.
 */

import { RefObject } from 'react';

/**
 * Алгебраический тип состояния кнопки.
 * Использует дискриминируемое объединение для типобезопасного управления состояниями.
 * Следует принципам функционального программирования с алгебраическими типами.
 */
export type ModelButtonState =
  /** Кнопка скрыта, не отображается */
  | { type: 'hidden' }
  /** Кнопка видима с указанной позицией */
  | { type: 'visible'; position: { x: number; y: number } }
  /** Кнопка остановки видима с указанной позицией */
  | { type: 'stop'; position: { x: number; y: number } };

/**
 * Позиция кнопки на экране.
 * Координаты относительно viewport с учетом прокрутки.
 */
export type ModelButtonPosition = {
  /** Горизонтальная координата (пиксели) */
  x: number;
  /** Вертикальная координата (пиксели) */
  y: number;
};

/**
 * Конфигурация хука useTranslateButton.
 * Определяет параметры поведения кнопки.
 */
export interface UseModelButtonConfig {
  /** Callback для обработки клика по кнопке использования модели */
  onUseModel?: () => void;
  /** Callback для обработки клика по кнопке остановки */
  onStop?: () => void;
  /** Флаг состояния обработки (влияет на тип отображаемой кнопки) */
  isProcessing?: boolean;
  /** Смещение позиции кнопки относительно курсора мыши */
  positionOffset?: { x: number; y: number };
  /** Ссылка на контейнер для корректного позиционирования */
  containerRef?: RefObject<HTMLElement | null> | null;
}
