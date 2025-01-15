import BaseButton from '../base-button';

/**
 * React компонент кнопки-иконки
 * @param {object} props - Объект, передаваемый в BaseButton
 */

function IconButton({ ...props }) {
  return <BaseButton className='icon-button' type='text' {...props} />;
}

export default IconButton;
