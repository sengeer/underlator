import './index.scss';

interface BaseButton {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  text?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  isActiveStyle?: boolean;
  isDisabled?: boolean;
  tooltipText?: string;
}

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
}: BaseButton) {
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
