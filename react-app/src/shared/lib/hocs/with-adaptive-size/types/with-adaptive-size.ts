/**
 * @module WithAdaptiveSizeTypes
 * Типы для HOC WithAdaptiveSize.
 */

/**
 * Размеры компонентов для адаптивного отображения.
 * Определяет три размера: S (маленький), M (средний), L (большой).
 * Используется для адаптации размеров иконок и других UI элементов в зависимости от ширины экрана.
 */
export type size = 'S' | 'M' | 'L';

/**
 * Интерфейс для пропсов HOC WithAdaptiveSize.
 */
export interface WithAdaptiveSizeProps {
  /** Компонент, который будет обернут для адаптивного изменения размера */
  WrappedComponent: React.ComponentType<{ width: number; height: number }>;
}
