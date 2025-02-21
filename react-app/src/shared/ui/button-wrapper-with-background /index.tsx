import './index.scss';

function ButtonWrapperWithBackground({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className='button-wrapper-with-background' onClick={onClick}>
      {children}
    </div>
  );
}

export default ButtonWrapperWithBackground;
