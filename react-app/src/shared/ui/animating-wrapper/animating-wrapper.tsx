import './styles/animating-wrapper.scss';
import { AnimatingWrapperProps } from './types/animating-wrapper';

function AnimatingWrapper({ children, isShow }: AnimatingWrapperProps) {
  return (
    <div
      className={`animating-wrapper${isShow ? ' animating-wrapper_show' : ''}`}>
      {children}
    </div>
  );
}

export default AnimatingWrapper;
