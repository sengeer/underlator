/**
 * @type size
 * @description Размеры компонентов для адаптивного отображения
 * Определяет три размера: S (маленький), M (средний), L (большой)
 * Используется для адаптации размеров иконок и других UI элементов в зависимости от ширины экрана
 */
export type size = 'S' | 'M' | 'L';

/**
 * @interface WithAdaptiveSizeProps
 * @description Пропсы для HOC адаптивного размера
 * @property {React.ComponentType<{ width: number; height: number }>} WrappedComponent - Компонент, который будет обернут для адаптивного изменения размера
 */
export interface WithAdaptiveSizeProps {
  WrappedComponent: React.ComponentType<{ width: number; height: number }>;
}
