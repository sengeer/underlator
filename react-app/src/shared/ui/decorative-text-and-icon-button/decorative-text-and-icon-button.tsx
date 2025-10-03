/**
 * @module DecorativeTextAndIconButton
 * Декоративная кнопка с текстом и иконкой.
 * Предоставляет стилизованный компонент с возможностью кастомизации цветового оформления.
 */

import styled from 'styled-components';
import TextAndIconButton from '../text-and-icon-button';
import { DecorativeTextAndIconButtonProps } from './types/decorative-text-and-icon-button';

/**
 * Компонент декоративной кнопки с текстом и иконкой.
 * Создает стилизованную версию TextAndIconButton с возможностью настройки цвета.
 * Автоматически передает все базовые пропсы родительскому компоненту.
 *
 * Реализует паттерн styled-components для динамической стилизации,
 * обеспечивая применение переданного цвета как к тексту, так и к иконке.
 *
 * @param props - Пропсы компонента с расширенной функциональностью
 * @param props.decorativeColor - Цвет для текста и иконки в CSS формате
 * @returns JSX элемент стилизованной кнопки
 *
 * @example
 * // Базовая кнопка с кастомным цветом
 * <DecorativeTextAndIconButton
 *   text="Перевод"
 *   decorativeColor="var(--main)"
 * >
 *   <TranslateIcon />
 * </DecorativeTextAndIconButton>
 */
function DecorativeTextAndIconButton({
  decorativeColor = 'var(--foreground)',
  ...props
}: DecorativeTextAndIconButtonProps) {
  // Стилизованная обертка над TextAndIconButton с динамическим цветом
  const StyledTextAndIconButton = styled(TextAndIconButton)`
    gap: 1rem;
    color: ${decorativeColor};

    & path {
      fill: ${decorativeColor};
    }
  `;

  // Кнопка всегда остается в отключенном состоянии с переданными пропсами
  return <StyledTextAndIconButton isDisabled {...props} />;
}

export default DecorativeTextAndIconButton;
