import BaseButton from '../base-button';

/**
 * React компонент тектовой кнопки
 * @param {object} props - Объект, передаваемый в BaseButton
 */

function TextButton({ ...props }) {
  return <BaseButton className='text-button' {...props} />;
}

export default TextButton;
