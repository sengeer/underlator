/**
 * @description Состояния компонента SelectorOption
 * Определяет визуальное представление и доступные действия
 */
export type SelectorOptionState =
  | 'available' // Доступно для загрузки
  | 'loading' // В процессе загрузки
  | 'installed'; // Установлено и доступно

/**
 * @interface ProgressInfo
 * @description Информация о прогрессе загрузки
 * Используется только для состояния loading
 * @property {number} percentage - Текущий прогресс в процентах (0-100)
 * @property {number} currentSize - Текущий размер загруженных данных в байтах
 * @property {number} totalSize - Общий размер для загрузки в байтах
 */
export interface ProgressInfo {
  percentage: number;
  currentSize: number;
  totalSize: number;
}

/**
 * @interface ActionHandlers
 * @description Обработчики событий для действий с моделью
 * @property {() => void} onInstall - Обработчик загрузки модели
 * @property {() => void} onRemove - Обработчик удаления модели
 */
export interface ActionHandlers {
  onInstall?: () => void;
  onRemove?: () => void;
}

/**
 * @interface SelectorOptionProps
 * @description Основные пропсы компонента SelectorOption
 * @property {string} text - Основной текст элемента
 * @property {SelectorOptionState} state - Состояние компонента
 * @property {string} className - Дополнительные CSS классы
 * @property {React.CSSProperties} style - Инлайн стили
 * @property {() => void} onClick - Обработчик клика по элементу
 * @property {boolean} isActive - Активен ли элемент (выбран)
 * @property {ProgressInfo} progressInfo - Информация о прогрессе загрузки
 * @property {ActionHandlers} actionHandlers - Обработчики действий
 */
export interface SelectorOptionProps {
  text: string;
  state: SelectorOptionState;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  isActive?: boolean;

  // Данные для состояния loading
  progressInfo?: ProgressInfo;
  actionHandlers?: ActionHandlers;
}
