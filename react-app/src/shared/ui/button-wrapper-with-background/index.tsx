import './index.scss';

interface ButtonWrapperWithBackground {
  onClick?: () => void;
  children: React.ReactNode;
}

function ButtonWrapperWithBackground({
  onClick,
  children,
}: ButtonWrapperWithBackground) {
  return (
    <div className='button-wrapper-with-background' onClick={onClick}>
      {children}
    </div>
  );
}

export default ButtonWrapperWithBackground;
