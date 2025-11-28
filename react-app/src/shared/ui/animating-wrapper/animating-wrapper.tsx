/**
 * @module AnimatingWrapper
 * Обертка для плавного появления/скрытия контента с помощью CSS анимаций.
 */

import './styles/animating-wrapper.scss';
import { AnimatingWrapperProps } from './types/animating-wrapper';

/**
 * Компонент-обертка, который добавляет CSS-класс для управления анимацией появления.
 *
 * Используется во вспомогательных UI-компонентах (`MarkdownRenderer`, `TextTranslator`,
 * `PdfViewer`) для плавного переключения иконок состояний, уведомлений и управляющих
 * элементов без перерендера вложенного контента.
 *
 * @param props - Пропсы компонента AnimatingWrapper.
 * @returns JSX-обертка, управляющая CSS-анимацией вложенных элементов.
 *
 * @example
 * // Переключение иконок копирования
 * <AnimatingWrapper isShow={isCopied}>
 *   <CheckIcon />
 * </AnimatingWrapper>
 *
 * @example
 * // Скрытие/появление кнопки действия
 * <AnimatingWrapper isShow={isTranslateButtonVisible}>
 *   <IconButton />
 * </AnimatingWrapper>
 */
function AnimatingWrapper({ children, isShow }: AnimatingWrapperProps) {
  return (
    <div
      className={`animating-wrapper${isShow ? ' animating-wrapper_show' : ''}`}>
      {children}
    </div>
  );
}

export default AnimatingWrapper;
