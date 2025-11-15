import { SelectorOptionProps } from './types/selector-option';

/**
 * Минималистичный компонент для простого отображения SelectorOption.
 * Одна строка с TextButton слева и обработчиком клика на всю область.
 */
function SimpleMode({
  className,
  style,
  onClick,
  children,
}: SelectorOptionProps) {
  return (
    <div
      className={`selector-option selector-option_simple ${className || ''}`}
      style={style}
      onClick={onClick}>
      {children}
    </div>
  );
}

export default SimpleMode;
