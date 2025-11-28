/**
 * @module BaseButton
 * Базовый компонент кнопки для переиспользования в разных виджетах.
 */

import './styles/base-button.scss';
import { BaseButtonProps } from './types/base-button';

/**
 * Универсальная кнопка с поддержкой иконок, текстового содержимого и подсказок.
 *
 * Компонент служит «основой» для других кнопок,
 * реализуемой по принципу LSP (принцип подстановки Барбары Лисков).
 *
 * @param props - Пропсы компонента. См. `BaseButtonProps` для полного описания.
 * @returns JSX-элемент кнопки с базовым стилем.
 *
 * @example
 * // Прямое использование
 * <BaseButton text='Сохранить' onClick={handleSave} />
 *
 * @example
 * // С иконкой и подсказкой
 * <BaseButton tooltipText='Открыть настройки'>
 *   <SettingsIcon />
 * </BaseButton>
 *
 * @example
 * // Через композицию в IconButton
 * <IconButton
 *   aria-label='Добавить документ'
 *   onClick={handleAdd}
 * />
 */
function BaseButton({
  children,
  className,
  id,
  text,
  style,
  onClick,
  isActiveStyle,
  isDisabled,
  tooltipText,
  onMouseEnter,
  onMouseLeave,
}: BaseButtonProps) {
  return (
    <button
      className={`base-button${isDisabled ? ' base-button_disabled' : ''}${isActiveStyle ? ' base-button_active' : ''} ${className || ''}`}
      id={id}
      style={style}
      onClick={onClick}
      disabled={isDisabled}
      title={tooltipText}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}>
      {children && <div className='base-button__icon'>{children}</div>}
      {text && <span className='text-body-m base-button__text'>{text}</span>}
    </button>
  );
}

export default BaseButton;
