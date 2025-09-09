/**
 * @module SelectorOptionTypes
 * @description Типы для компонента SelectorOption
 */

/**
 * @description Состояния компонента SelectorOption
 * Определяет визуальное представление и доступные действия
 */
export type SelectorOptionState =
  | 'available' // Доступно для загрузки
  | 'loading' // В процессе загрузки
  | 'installed'; // Установлено и доступно

/**
 * @description Информация о прогрессе загрузки
 * Используется только для состояния loading
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
 * @description Обработчики событий для действий с моделью
 */
export interface ActionHandlers {
  /** Обработчик загрузки модели */
  onInstall?: () => void;
  /** Обработчик удаления модели */
  onRemove?: () => void;
}

/**
 * @description Основные пропсы компонента SelectorOption
 */
export interface SelectorOptionProps {
  /** Основной текст элемента */
  text: string;
  /** Состояние компонента */
  state: SelectorOptionState;
  /** Дополнительные CSS классы */
  className?: string;
  /** Инлайн стили */
  style?: React.CSSProperties;
  /** Обработчик клика по элементу */
  onClick?: () => void;
  /** Активен ли элемент (выбран) */
  isActive?: boolean;

  // Данные для состояния loading
  /** Информация о прогрессе загрузки */
  progressInfo?: ProgressInfo;
  /** Обработчики действий */
  actionHandlers?: ActionHandlers;
}
