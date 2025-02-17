import './index.scss';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import LanguageIcon from '../../../shared/assets/icons/language-icon';
import {
  openElement,
  closeElement,
  isElementOpen,
} from '../../../shared/model/element-state-slice';
import LanguageSelectorPopup from '../../../shared/ui/language-selector-popup';
import TextAndIconButtonWithBackground from '../../../shared/ui/text-and-icon-button-with-background/';

function Settings({ isOpened }: { isOpened: boolean }) {
  const [selectedSourceLanguageKey, setSelectedSourceLanguageKey] =
    useState('russian');
  const [sourceLanguage, setSourceLanguage] = useState('rus');

  const dispatch = useDispatch();

  const isOpenLanguageSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'languageSelectorPopup')
  );

  return (
    <section className={`settings${isOpened ? ' settings_open' : ''}`}>
      <div className='settings__container'>
        <TextAndIconButtonWithBackground
          text='Язык интерфейса'
          value={selectedSourceLanguageKey}
          onClick={() => dispatch(openElement('languageSelectorPopup'))}>
          <LanguageIcon />
        </TextAndIconButtonWithBackground>
        <LanguageSelectorPopup
          isOpened={isOpenLanguageSelectorPopup}
          setOpened={() => dispatch(closeElement('languageSelectorPopup'))}
          setSelectedLanguageKey={setSelectedSourceLanguageKey}
          selectedLanguageValue={sourceLanguage}
          setSelectedLanguageValue={setSourceLanguage}
          defaultLanguage={'rus'}
        />
      </div>
    </section>
  );
}

export default Settings;
