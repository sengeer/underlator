import './index.scss';
import TextAndIconButton from '../text-and-icon-button';

/**
 * React компонент кнопки с текстом и иконкой на фоне
 * @param {object} props - Объект, передаваемый в BaseButton
 */

function TextAndIconButtonWithBackground({
  value,
  onClick,
  children,
  ...props
}: {
  value: string;
  onClick: () => void;
  children: React.ReactNode;
  text: string;
}) {
  return (
    <div className='text-and-icon-button-with-background' onClick={onClick}>
      <TextAndIconButton
        className='text-and-icon-button'
        style={{ cursor: 'pointer' }}
        isDisabled
        {...props}>
        {children}
      </TextAndIconButton>
      <p className='text-and-icon-button-with-background__text'>{value}</p>
    </div>
  );
}

export default TextAndIconButtonWithBackground;
