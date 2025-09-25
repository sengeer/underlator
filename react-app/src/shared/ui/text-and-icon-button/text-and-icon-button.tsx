import './styles/text-and-icon-button.scss';
import BaseButton from '../base-button';

function TextAndIconButton({ ...props }) {
  return <BaseButton className='text-and-icon-button' {...props} />;
}

export default TextAndIconButton;
