/**
 * @module UseTranslateButtonConstants
 * Константы для хука useTranslateButton.
 * Определяет значения по умолчанию для конфигурации кнопки перевода.
 */

import { UseTranslateButtonConfig } from '../types/use-translate-button';

/**
 * Конфигурация по умолчанию для хука useTranslateButton.
 * Используется когда пользователь не указывает специфичные параметры.
 * Следует принципам функционального программирования с чистыми функциями.
 */
export const DEFAULT_CONFIG: Required<UseTranslateButtonConfig> = {
  /** Callback для обработки клика по кнопке перевода */
  onTranslate: () => {},
  /** Callback для обработки клика по кнопке остановки */
  onStop: () => {},
  /** Флаг состояния обработки (влияет на тип отображаемой кнопки) */
  isProcessing: false,
  /** Смещение позиции кнопки относительно выделенного текста */
  positionOffset: { x: -32, y: 5 },
  /** Ссылка на контейнер для корректного позиционирования */
  containerRef: null,
};
