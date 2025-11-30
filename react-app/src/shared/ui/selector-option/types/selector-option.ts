/**
 * @module SelectorOptionTypes
 * Типы для SelectorOption.
 */

/**
 * Состояния компонента SelectorOption.
 */
export type SelectorOptionState =
  /** Доступно для загрузки */
  | 'available'
  /** В процессе загрузки */
  | 'loading'
  /** Установлено и доступно */
  | 'installed'
  /** Простой режим */
  | 'simple'
  /** Не определено */
  | undefined;

/**
 * Информация о прогрессе загрузки.
 * Используется только для состояния loading.
 */
export interface ProgressInfo {
  /** Текущий прогресс в процентах (0-100) */
  percentage: number;
  /** Текущий размер загруженных данных в байтах */
  currentSize: number;
  /** Общий размер для загрузки в байтах */
  totalSize: number;
}

/**
 * Обработчики событий для действий с моделью.
 */
export interface ActionHandlers {
  /** Обработчик загрузки модели */
  onInstall?: () => void;
  /** Обработчик удаления модели */
  onRemove?: () => void;
}

/**
 * Статус совместимости модели с системой.
 */
export type CompatibilityStatus =
  | 'ok'
  | 'insufficient_ram'
  | 'insufficient_vram'
  | 'unknown';

/**
 * Основные пропсы компонента SelectorOption.
 */
export interface SelectorOptionProps {
  type: 'simple' | 'bar';
  /** Состояние компонента */
  state?: SelectorOptionState;
  /** Дополнительные CSS классы */
  className?: string;
  /** Инлайн стили */
  style?: React.CSSProperties;
  /** Обработчик клика по элементу */
  onClick?: () => void;
  /** Данные для состояния loading */
  progressInfo?: ProgressInfo;
  /** Обработчики действий */
  actionHandlers?: ActionHandlers;
  /** Дочерний(ие) элемент(ы) */
  children: React.JSX.Element;
  /** Статус совместимости модели с системой */
  compatibilityStatus?: CompatibilityStatus;
  /** Сообщение о совместимости */
  compatibilityMessages?: string[];
}
