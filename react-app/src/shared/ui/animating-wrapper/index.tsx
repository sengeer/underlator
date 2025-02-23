import './index.scss';

interface AnimatingWrapper {
  children: React.ReactNode;
  isShow: boolean;
}

function AnimatingWrapper({ children, isShow }: AnimatingWrapper) {
  return (
    <div
      className={`animating-wrapper${isShow ? ' animating-wrapper_show' : ''}`}>
      {children}
    </div>
  );
}

export default AnimatingWrapper;
