import Popup from '../popup';
import TextButton from '../text-button/text-button';

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
      isOpened={isOpened}
      setOpened={setOpened}
      styleWrapper={{ minWidth: '30.4352%' }}>
      <div className='selector-popup'>
        {Object.entries(data).map(([key, value]) => (
          <TextButton
            key={value}
            text={key}
            style={{ margin: '0.5rem 0' }}
            onClick={() => {
              setSelectedKey(key);
              setSelectedValue(value);
              setOpened(false);
            }}
            isActiveStyle={selectedValue === value}
          />
        ))}
      </div>
    </Popup>
  );
}

export default SelectorPopup;
