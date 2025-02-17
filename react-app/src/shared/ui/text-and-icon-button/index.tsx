import './index.scss';
import BaseButton from '../base-button';

/**
 * React компонент кнопки с текстом и иконкой
 * @param {object} props - Объект, передаваемый в BaseButton
 */

function TextAndIconButton({ ...props }) {
  return <BaseButton className='text-and-icon-button' {...props} />;
}

export default TextAndIconButton;
