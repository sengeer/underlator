import TextButton from '../text-button';
import './styles/text-button-filled.scss';

function TextButtonFilled({ ...props }) {
  return <TextButton className='text-button-filled' {...props} />;
}

export default TextButtonFilled;
