/**
 * @module ColorPicker
 * Компонент для управления пользовательскими цветовыми переменными.
 */

import './styles/color-picker.scss';
import { useState, useEffect, useRef } from 'react';
import PaletteIcon from '../../assets/icons/palette-icon';
import {
  getStorageWrite,
  setStorageWrite,
} from '../../lib/utils/control-local-storage';
import ButtonWrapperWithBackground from '../button-wrapper-with-background';
import TextAndIconButton from '../text-and-icon-button';
import { ColorPickerProps } from './types/color-picker';

/**
 * Компонент ColorPicker позволяет пользователю управлять CSS-переменными темы
 * через локальное состояние и локальное хранилище. Значение сохраняется в
 * `localStorage`, чтобы оформление приложения оставалось неизменным между
 * перезапусками.
 *
 * @param props - Пропсы компонента. Подробности см. в {@link ColorPickerProps}.
 * @returns JSX элемент селектора цвета.
 *
 * @example
 * <ColorPicker
 *   text='Основной фон'
 *   variable='--theme-background'
 *   color='#212121'
 * />
 */
function ColorPicker({ text, variable, color }: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(color);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Синхронизация с локальным хранилищем поддерживает неизменность фирменной палитры между сессиями
    const savedColor = getStorageWrite(variable);
    if (savedColor) {
      updateColorVariable(savedColor);
      setSelectedColor(savedColor);
    }
  }, []);

  /**
   * Обновляет CSS-переменную документа, чтобы синхронизировать UI с выбором.
   */
  function updateColorVariable(color: string) {
    document.documentElement.style.setProperty(variable, color);
  }

  /**
   * Обрабатывает изменение цвета, сохраняя его в состоянии и локальном хранилище.
   */
  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newColor = e.target.value;
    updateColorVariable(newColor);
    setSelectedColor(newColor);
    setStorageWrite(variable, newColor);
  }

  /**
   * Программно инициирует выбор цвета, чтобы сохранить целостность UI-кнопок.
   */
  function handleButtonClick() {
    if (colorInputRef.current) {
      colorInputRef.current.click();
    }
  }

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
