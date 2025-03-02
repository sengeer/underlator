import './index.scss';
import { useLingui } from '@lingui/react/macro';
import { Trans } from '@lingui/react/macro';
import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import LanguageIcon from '../../../shared/assets/icons/language-icon';
import { loadCatalog } from '../../../shared/lib/i18n';
import {
  openElement,
  closeElement,
  isElementOpen,
} from '../../../shared/model/element-state-slice';
import ButtonWrapperWithBackground from '../../../shared/ui/button-wrapper-with-background ';
import ColorPicker from '../../../shared/ui/color-picker';
import SelectorPopup from '../../../shared/ui/selector-popup';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';

export interface Languages {
  [key: string]: string;
}

const LANGUAGES: Languages = {
  english: 'en',
  русский: 'ru',
};

interface Settings {
  isOpened: boolean;
}

function Settings({ isOpened }: Settings) {
  const [languageKey, setLanguageKey] = useState('русский');
  const [language, setLanguage] = useState('ru');
  const { t } = useLingui();
  const dispatch = useDispatch();

  const isOpenLanguageSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'languageSelectorPopup')
  );

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      loadCatalog(lang);
    },
    [loadCatalog]
  );

  return (
    <section className={`settings${isOpened ? ' settings_open' : ''}`}>
      <div className='settings__container'>
        <div className='settings__column'>
          <h2 className='settings__title'>
            <Trans>main settings</Trans>
          </h2>
          <ButtonWrapperWithBackground
            onClick={() => dispatch(openElement('languageSelectorPopup'))}>
            <TextAndIconButton
              className='text-and-icon-button'
              text={t`interface language`}
              style={{ marginLeft: '1rem' }}
              isDisabled>
              <LanguageIcon />
            </TextAndIconButton>
            <p className='settings__text'>{languageKey}</p>
          </ButtonWrapperWithBackground>
        </div>
        <div className='settings__column'>
          <h2 className='settings__title'>
            <Trans>color scheme</Trans>
          </h2>
          <div className='settings__btns-group'>
            <ColorPicker
              text={t`main color`}
              variable='--main'
              color='#6272a4'
            />
            <ColorPicker
              text={t`background color`}
              variable='--background'
              color='#282a36'
            />
            <ColorPicker
              text={t`accent color`}
              variable='--accent'
              color='#bd93f9'
            />
            <ColorPicker
              text={t`foreground color`}
              variable='--foreground'
              color='#f8f8f2'
            />
          </div>
        </div>
      </div>
      <SelectorPopup
        data={LANGUAGES}
        isOpened={isOpenLanguageSelectorPopup}
        setOpened={() => dispatch(closeElement('languageSelectorPopup'))}
        setSelectedKey={setLanguageKey}
        selectedValue={language}
        setSelectedValue={handleLanguageChange}
      />
    </section>
  );
}

export default Settings;
