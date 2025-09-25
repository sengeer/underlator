import './styles/decorative-text-and-icon-button.scss';
import TextAndIconButton from '../text-and-icon-button';

function DecorativeTextAndIconButton({ ...props }) {
  return (
    <TextAndIconButton
      className='decorative-text-and-icon-button'
      isDisabled
      {...props}
    />
  );
}

export default DecorativeTextAndIconButton;
