/**
 * @module DecorativeTextAndIconButtonTypes
 * Типы для декоративной кнопки с текстом и иконкой.
 * Расширяет базовые пропсы кнопки дополнительными параметрами стилизации.
 */

import { BaseButtonProps } from '../../base-button/types/base-button';

/**
 * Интерфейс пропсов компонента DecorativeTextAndIconButton.
 * Предоставляет возможность кастомизации цветового оформления элемента.
 */
export interface DecorativeTextAndIconButtonProps extends BaseButtonProps {
  /** Цвет для текста и иконки кнопки в CSS формате (hex, rgb, css-переменная) */
  decorativeColor?: string;
}
