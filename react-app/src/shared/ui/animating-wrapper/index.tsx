import './index.scss';

interface AnimatingWrapperProps {
  children: React.ReactNode;
  isShow: boolean;
}

function AnimatingWrapper({ children, isShow }: AnimatingWrapperProps) {
  return (
    <div
      className={`animating-wrapper${isShow ? ' animating-wrapper_show' : ''}`}>
      {children}
    </div>
  );
}

export default AnimatingWrapper;
