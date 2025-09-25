import TextButton from '../text-button/text-button';
import { SelectorOptionProps } from './types/selector-option';

/**
 * @module SimpleMode
 * @description Минималистичный компонент для простого отображения SelectorOption
 * Одна строка с TextButton слева и обработчиком клика на всю область
 */
function SimpleMode({
  text,
  className,
  style,
  onClick,
  isActive,
}: SelectorOptionProps) {
  return (
    <div
      className={`selector-option selector-option_simple ${className || ''}`}
      style={style}
      onClick={onClick}>
      <TextButton text={text} isDisabled={true} isActiveStyle={isActive} />
    </div>
  );
}

export default SimpleMode;
