import Popup from '../popup';
import SelectorOption from '../selector-option/';

interface SelectorPopup {
  data: Object;
  isOpened: boolean;
  setOpened: (value: boolean) => void;
  setSelectedKey: (value: string) => void;
  selectedValue: string;
  setSelectedValue: (value: string) => void;
}

function SelectorPopup({
  data,
  isOpened,
  setOpened,
  setSelectedKey,
  selectedValue,
  setSelectedValue,
}: SelectorPopup) {
  return (
    <Popup
      isOpened={isOpened && Object.keys(data).length > 1}
      setOpened={setOpened}
      styleWrapper={{ minWidth: '30.4352%' }}>
      <div className='selector-popup'>
        {Object.entries(data).map(([key, value]) => (
          <SelectorOption
            key={value}
            state='available'
            text={key}
            isActive={selectedValue === value}
            onClick={() => {
              setSelectedKey(key);
              setSelectedValue(value);
              setOpened(false);
            }}
          />
        ))}
      </div>
    </Popup>
  );
}

export default SelectorPopup;
