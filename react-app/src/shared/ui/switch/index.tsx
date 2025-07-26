import './index.scss';

interface Switch {
  checked: boolean;
  onChange: () => void;
}

function Switch({ checked, onChange }: Switch) {
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
