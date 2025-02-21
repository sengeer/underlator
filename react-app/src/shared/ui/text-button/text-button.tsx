import BaseButton from '../base-button';

function TextButton({ ...props }) {
  return <BaseButton className='text-button' {...props} />;
}

export default TextButton;
