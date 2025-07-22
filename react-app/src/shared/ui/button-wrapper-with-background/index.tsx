import './index.scss';

interface ButtonWrapperWithBackground {
  onClick?: () => void;
  children: React.ReactNode;
  isDisabled?: boolean;
}

function ButtonWrapperWithBackground({
  onClick,
  children,
  isDisabled,
}: ButtonWrapperWithBackground) {
  return (
    <div
      className={`button-wrapper-with-background ${isDisabled && 'button-wrapper-with-background_disabled'}`}
      onClick={onClick}>
      {children}
    </div>
  );
}

export default ButtonWrapperWithBackground;
