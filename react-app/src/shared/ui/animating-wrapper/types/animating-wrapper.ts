/**
 * @module AnimatingWrapperTypes
 * Типы для компонента AnimatingWrapper.
 */

/**
 * Пропсы для компонента AnimatingWrapper.
 */
export interface AnimatingWrapperProps {
  /** Контент, который требуется анимировать */
  children: React.ReactNode;
  /** Управляет применением класса появления */
  isShow: boolean;
}
