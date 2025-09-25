import './styles/button-wrapper-with-background.scss';
import { ButtonWrapperWithBackgroundProps } from './types/button-wrapper-with-background';

function ButtonWrapperWithBackground({
  onClick,
  children,
  isDisabled,
}: ButtonWrapperWithBackgroundProps) {
  return (
    <div
      className={`button-wrapper-with-background ${isDisabled && 'button-wrapper-with-background_disabled'}`}
      onClick={onClick}>
      {children}
    </div>
  );
}

export default ButtonWrapperWithBackground;
