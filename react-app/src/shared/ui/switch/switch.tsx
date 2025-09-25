import './styles/switch.scss';
import { SwitchProps } from './types/switch';

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
