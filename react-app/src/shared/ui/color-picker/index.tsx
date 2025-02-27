import './index.scss';
import { useState, useEffect, useRef } from 'react';
import PaletteIcon from '../../assets/icons/palette-icon';
import {
  getStorageWrite,
  setStorageWrite,
} from '../../lib/utils/control-local-storage';
import ButtonWrapperWithBackground from '../button-wrapper-with-background ';
import TextAndIconButton from '../text-and-icon-button';

interface ColorPicker {
  text: string;
  variable: string;
  color: string;
}

function ColorPicker({ text, variable, color }: ColorPicker) {
  const [selectedColor, setSelectedColor] = useState(color);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedColor = getStorageWrite(variable);
    if (savedColor) {
      updateColorVariable(savedColor);
      setSelectedColor(savedColor);
    }
  }, []);

  const updateColorVariable = (color: string) => {
    document.documentElement.style.setProperty(variable, color);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    updateColorVariable(newColor);
    setSelectedColor(newColor);
    setStorageWrite(variable, newColor);
  };

  const handleButtonClick = () => {
    if (colorInputRef.current) {
      colorInputRef.current.click(); // Программно вызываем клик по input
    }
  };

  return (
    <ButtonWrapperWithBackground onClick={handleButtonClick}>
      <TextAndIconButton
        text={text}
        className='text-and-icon-button'
        style={{ marginLeft: '1rem' }}
        isDisabled>
        <PaletteIcon />
      </TextAndIconButton>
      <input
        ref={colorInputRef}
        className='color-picker'
        type='color'
        key={variable}
        value={selectedColor}
        onChange={handleColorChange}
      />
    </ButtonWrapperWithBackground>
  );
}

export default ColorPicker;
