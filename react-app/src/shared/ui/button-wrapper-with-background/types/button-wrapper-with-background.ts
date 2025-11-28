/**
 * @module ButtonWrapperWithBackgroundTypes
 * Типы для компонента ButtonWrapperWithBackground.
 */

/**
 * Пропсы для компонента ButtonWrapperWithBackground.
 */
export interface ButtonWrapperWithBackgroundProps {
  /** Обработчик клика по внешнему контейнеру */
  onClick?: () => void;
  /** Инлайн-стили для точечной подстройки отступов и размеров */
  style?: React.CSSProperties;
  /** Составной контент кнопки, включая вложенные элементы */
  children: React.ReactNode;
  /** Флаг, отключающий взаимодействие и визуальные состояния */
  isDisabled?: boolean;
}
