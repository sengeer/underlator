/**
 * @module Switch
 * Бинарный переключатель для смены режимов интерфейса.
 */

import './styles/switch.scss';
import { SwitchProps } from './types/switch';

/**
 * UI-переключатель на базе чекбокса.
 *
 * Компонент служит оберткой над системным input, сохраняя совместимость
 * с инструментами доступности и позволяя переиспользовать стилизацию на других виджетах.
 *
 * @param props - Пропсы компонента. См. `SwitchProps`.
 * @returns JSX элемент переключателя.
 *
 * @example
 * <Switch
 *   checked={settings.typeUse === 'instruction'}
 *   onChange={toggleInstructionMode}
 * />
 */
function Switch({ checked, onChange }: SwitchProps) {
  return (
    <label className='switch'>
      <input type='checkbox' checked={checked} onChange={onChange} />
      <span className='slider'>
        <span className='circle' />
      </span>
    </label>
  );
}

export default Switch;
