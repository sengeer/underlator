import React from 'react';
import './index.scss';

interface BaseButton {
  children: React.ReactNode;
  className: string;
  id: string;
  text: string;
  style: React.CSSProperties;
  onClick: () => void;
  isActiveStyle: boolean;
  isDisabled: boolean;
  tooltipText: string;
}

/**
 * React компонент базовой кнопки
 * @param {ReactNode} children - Компонент React, иконка кнопки
 * @param {string} className - Строка, класс кнопки
 * @param {string} id - Строка, идентификатор кнопки
 * @param {string} text - Строка, текст кнопки
 * @param {CSSProperties} style - Объект, стили кнопки
 * @param {function} onClick - Коллбэк-функция, вызываемая при нажатии на кнопку
 * @param {boolean} isActiveStyle - Булев тип, определяющий добавление стилизации активного состояния кнопки
 * @param {boolean} isDisabled - Булев тип, определяющий состояние доступности кнопки
 * @param {string} tooltipText - Строка, текст всплывающей подсказки кнопки
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
