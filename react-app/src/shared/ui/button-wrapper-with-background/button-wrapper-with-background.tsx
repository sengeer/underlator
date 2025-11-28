/**
 * @module ButtonWrapperWithBackground
 * Обертка для составных кнопок и интерактивных панелей.
 */

import './styles/button-wrapper-with-background.scss';
import { ButtonWrapperWithBackgroundProps } from './types/button-wrapper-with-background';

/**
 * Обеспечивает унифицированный фон, ховер-состояние и делегирование кликов для сложных кнопок.
 *
 * Компонент используется в настройках тем, color picker и тостах, где вложенные элементы
 * должны реагировать на общий обработчик, а внешняя оболочка управляет блокировкой.
 *
 * @param props - См. `ButtonWrapperWithBackgroundProps`.
 * @returns Контейнер с визуально нейтральным фоном.
 *
 * @example
 * <ButtonWrapperWithBackground onClick={handleColorClick}>
 *   <TextAndIconButton isDisabled />
 *   <input type='color' hidden />
 * </ButtonWrapperWithBackground>
 *
 * @example
 * <ButtonWrapperWithBackground isDisabled>
 *   <ThemeSwitcherContent />
 * </ButtonWrapperWithBackground>
 */
function ButtonWrapperWithBackground({
  onClick,
  children,
  style,
  isDisabled,
}: ButtonWrapperWithBackgroundProps) {
  return (
    <div
      className={`button-wrapper-with-background ${isDisabled && 'button-wrapper-with-background_disabled'}`}
      // Состояние disabled изолирует ховер/клик вложенных элементов, чтобы исключить несогласованные изменения
      onClick={onClick}
      style={style}>
      {children}
    </div>
  );
}

export default ButtonWrapperWithBackground;
