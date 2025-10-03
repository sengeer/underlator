/**
 * @module DecorativeTextAndIconButton
 * Декоративная кнопка с текстом и иконкой.
 * Предоставляет стилизованный компонент с возможностью кастомизации цветового оформления.
 */

import styled from 'styled-components';
import TextAndIconButton from '../text-and-icon-button';
import { DecorativeTextAndIconButtonProps } from './types/decorative-text-and-icon-button';

/**
 * Базовый стилизованный компонент TextAndIconButton.
 * Определен вне компонента для избежания пересоздания при каждом рендере.
 * Использует CSS-переменные для динамической смены цвета.
 */
const StyledTextAndIconButton = styled(TextAndIconButton)<{
  $decorativeColor: string;
}>`
  gap: 1rem;
  color: ${(props) => props.$decorativeColor};

  & path {
    fill: ${(props) => props.$decorativeColor};
  }
`;

/**
 * Компонент декоративной кнопки с текстом и иконкой.
 * Создает стилизованную версию TextAndIconButton с возможностью настройки цвета.
 * Автоматически передает все базовые пропсы родительскому компоненту.
 *
 * Реализует паттерн styled-components для динамической стилизации,
 * обеспечивая применение переданного цвета как к тексту, так и к иконке.
 * Стилизованный компонент создается один раз вне функции для оптимизации производительности.
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
  // Кнопка всегда остается в отключенном состоянии с переданными пропсами
  return (
    <StyledTextAndIconButton
      isDisabled
      $decorativeColor={decorativeColor}
      {...props}
    />
  );
}

export default DecorativeTextAndIconButton;
