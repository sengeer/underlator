import './index.scss';
import { useLingui } from '@lingui/react/macro';
import { useState, useCallback } from 'react';
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
  const [languageKey, setLanguageKey] = useState('russian');
  const [language, setLanguage] = useState('ru');
  const { i18n, t } = useLingui();
  const dispatch = useDispatch();

  const isOpenLanguageSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'languageSelectorPopup')
  );

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      i18n.activate(lang);
    },
    [i18n]
  );

  return (
    <section className={`settings${isOpened ? ' settings_open' : ''}`}>
      <div className='settings__container'>
        <TextAndIconButtonWithBackground
          text={t`Interface language`}
          value={languageKey}
          onClick={() => dispatch(openElement('languageSelectorPopup'))}>
          <LanguageIcon />
        </TextAndIconButtonWithBackground>

        <LanguageSelectorPopup
          isOpened={isOpenLanguageSelectorPopup}
          setOpened={() => dispatch(closeElement('languageSelectorPopup'))}
          setSelectedLanguageKey={setLanguageKey}
          selectedLanguageValue={language}
          setSelectedLanguageValue={handleLanguageChange}
          defaultLanguage={'ru'}
        />
      </div>
    </section>
  );
}

export default Settings;
