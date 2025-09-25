import './styles/base-button.scss';
import { BaseButtonProps } from './types/base-button';

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
}: BaseButtonProps) {
  return (
    <button
      className={`base-button${isDisabled ? ' base-button_disabled' : ''}${isActiveStyle ? ' base-button_active' : ''} ${className || ''}`}
      id={id}
      style={style}
      onClick={onClick}
      disabled={isDisabled}
      title={tooltipText}>
      {children && <div className='base-button__icon'>{children}</div>}
      {text && <span className='base-button__text'>{text}</span>}
    </button>
  );
}

export default BaseButton;
