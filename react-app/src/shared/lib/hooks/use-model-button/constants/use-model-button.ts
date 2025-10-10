/**
 * @module UseModelButtonConstants
 * Константы для хука useModelButton.
 */

import { UseModelButtonConfig } from '../types/use-model-button';

/**
 * Конфигурация по умолчанию для хука useTranslateButton.
 * Используется когда пользователь не указывает специфичные параметры.
 * Следует принципам функционального программирования с чистыми функциями.
 */
export const DEFAULT_CONFIG: Required<UseModelButtonConfig> = {
  /** Callback для обработки клика по кнопке использования модели */
  onUseModel: () => {},
  /** Callback для обработки клика по кнопке остановки */
  onStop: () => {},
  /** Флаг состояния обработки (влияет на тип отображаемой кнопки) */
  isProcessing: false,
  /** Смещение позиции кнопки относительно курсора мыши */
  positionOffset: { x: 10, y: -10 },
  /** Ссылка на контейнер для корректного позиционирования */
  containerRef: null,
};
