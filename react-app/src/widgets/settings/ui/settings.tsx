import '../styles/settings.scss';
import { useLingui } from '@lingui/react/macro';
import { Trans } from '@lingui/react/macro';
import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CableIcon from '../../../shared/assets/icons/cable-icon';
import DownloadIcon from '../../../shared/assets/icons/download-icon';
import HttpIcon from '../../../shared/assets/icons/http-icon';
import LanguageIcon from '../../../shared/assets/icons/language-icon';
import NetworkIntelligenceIcon from '../../../shared/assets/icons/network-intelligence-icon';
import { DEFAULT_LOCALE } from '../../../shared/lib/constants';
import useElectronTranslation from '../../../shared/lib/hooks/use-electron-translation';
import useFormAndValidation from '../../../shared/lib/hooks/use-form-and-validation';
import { loadCatalog } from '../../../shared/lib/i18n';
import MODELS from '../../../shared/lib/mocks/jsons/model-list.json';
import {
  getStorageWrite,
  setStorageWrite,
} from '../../../shared/lib/utils/control-local-storage';
import {
  openElement,
  closeElement,
  isElementOpen,
} from '../../../shared/models/element-state-slice';
import {
  selectProviderSettings,
  setProvider,
  updateProviderSettings,
  setTypeUse,
} from '../../../shared/models/provider-settings-slice';
import ButtonWrapperWithBackground from '../../../shared/ui/button-wrapper-with-background';
import ColorPicker from '../../../shared/ui/color-picker';
import Popup from '../../../shared/ui/popup';
import PopupWithSearch from '../../../shared/ui/popup-with-search';
import SelectorOption from '../../../shared/ui/selector-option/';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import TextButton from '../../../shared/ui/text-button/text-button';
import { OLLAMA_TEST_MODEL, OLLAMA_TEST_PROMPT } from '../constants/ipc-tester';
import {
  testListModels,
  testInstallModel,
  testGenerateText,
  testRemoveModel,
  testGetCatalog,
  testGetCatalogForceRefresh,
  testSearchModels,
  testGetModelInfo,
  runFullTest,
} from '../tests/ipc-tester';
import ManageModels from './manage-embedded-ollama';

export interface PopupSelectorData {
  [key: string]: string;
}

const LANGUAGES: PopupSelectorData = {
  english: 'en',
  русский: 'ru',
};

const PROVIDERS: PopupSelectorData = {
  Ollama: 'Ollama',
  'Embedded Ollama': 'Embedded Ollama',
};

interface Settings {
  isOpened: boolean;
}

function Settings({ isOpened }: Settings) {
  const { values, handleChange, resetForm, setValues } = useFormAndValidation();
  const [searchValue, setSearchValue] = useState('');

  const dispatch = useDispatch();
  const { provider, settings } = useSelector(selectProviderSettings);

  const [languageKey, setLanguageKey] = useState(() => {
    const localeFromStorage = getStorageWrite('locale');

    if (typeof localeFromStorage === 'string' && localeFromStorage !== '') {
      return Object.keys(LANGUAGES).find(
        (key) => LANGUAGES[key] === localeFromStorage
      );
    } else {
      const entry = Object.entries(LANGUAGES).find(
        ([key, val]) => val === DEFAULT_LOCALE
      );

      return entry ? entry[0] : '';
    }
  });

  const [language, setLanguage] = useState(() => {
    const localeFromStorage = getStorageWrite('locale');

    return typeof localeFromStorage === 'string' && localeFromStorage !== ''
      ? localeFromStorage
      : DEFAULT_LOCALE;
  });

  const { t } = useLingui();
  const { translateElectron } = useElectronTranslation();

  const isOpenLanguageSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'languageSelectorPopup')
  );

  const isOpenProviderSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'providerSelectorPopup')
  );

  const isOpenTestListModelsPopup = useSelector((state) =>
    isElementOpen(state, 'testListModelsPopup')
  );

  const isOpenManageModelsPopup = useSelector((state) =>
    isElementOpen(state, 'manageModelsPopup')
  );

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      loadCatalog(lang);
      setStorageWrite('locale', lang);
      translateElectron();
    },
    [loadCatalog, translateElectron]
  );

  function handleProviderChange(newProvider: string) {
    dispatch(setProvider(newProvider as ProviderType));
  }

  // When changing inputs, save them in the store
  useEffect(() => {
    if (provider && (values.url !== undefined || values.model !== undefined)) {
      dispatch(updateProviderSettings({ provider, settings: values }));
      dispatch(setTypeUse({ provider, typeUse: 'translation' }));
    }
  }, [values, provider, dispatch]);

  // When changing the provider or initializing, set the values from the store
  useEffect(() => {
    if (provider && settings[provider]) {
      setValues(settings[provider]);
    } else {
      resetForm();
    }
  }, [provider, setValues, resetForm]);

  return (
    <section className={`settings${isOpened ? ' settings_open' : ''}`}>
      {/* IPC API Testing Section */}
      {import.meta.env.DEV && (
        <div className='settings__container'>
          <div className='settings__column'>
            <h2 className='settings__title'>{'Тестирование IPC API'}</h2>
            <div className='settings__btns-group'>
              <TextButton onClick={testListModels} className='settings__button'>
                {'📋 Список установленных моделей'}
              </TextButton>
              <TextButton onClick={testGetCatalog} className='settings__button'>
                {'📚 Получить каталог'}
              </TextButton>
              <TextButton
                onClick={testGetCatalogForceRefresh}
                className='settings__button'>
                {'🔄 Обновить каталог'}
              </TextButton>
              <TextButton
                onClick={testSearchModels}
                className='settings__button'>
                {'🔍 Поиск моделей'}
              </TextButton>
              <TextButton
                onClick={testGetModelInfo}
                className='settings__button'>
                {'ℹ️ Получить информацию о модели'}
              </TextButton>
              <TextButton
                onClick={testInstallModel}
                className='settings__button'>
                {'📥 Установить ' + OLLAMA_TEST_MODEL}
              </TextButton>
              <TextButton
                onClick={testGenerateText}
                className='settings__button'>
                {'🤖 Генерация ' + OLLAMA_TEST_PROMPT}
              </TextButton>
              <TextButton
                onClick={testRemoveModel}
                className='settings__button'>
                {'🗑️ Удалить ' + OLLAMA_TEST_MODEL}
              </TextButton>
              <TextButton
                onClick={() => dispatch(openElement('testListModelsPopup'))}
                className='settings__button'>
                {'📋 Тестирование списка моделей'}
              </TextButton>
              <TextButton onClick={runFullTest} className='settings__button'>
                {'🚀 Запуск полного тестирования'}
              </TextButton>
            </div>
            <p className='settings__description'>
              {'Тестирование Ollama IPC API. Проверьте результаты в консоли.'}
            </p>
          </div>
        </div>
      )}

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
          <h2 className='settings__title'>
            <Trans>api configuration</Trans>
          </h2>
          <ButtonWrapperWithBackground
            onClick={() => dispatch(openElement('providerSelectorPopup'))}>
            <TextAndIconButton
              className='text-and-icon-button'
              text={t`provider`}
              style={{ marginLeft: '1rem' }}
              isDisabled>
              <CableIcon />
            </TextAndIconButton>
            <p className='settings__text'>{provider}</p>
          </ButtonWrapperWithBackground>
          {provider === 'Ollama' && (
            <>
              <ButtonWrapperWithBackground>
                <TextAndIconButton
                  className='text-and-icon-button'
                  text={'url'}
                  style={{ marginLeft: '1rem' }}
                  isDisabled>
                  <HttpIcon />
                </TextAndIconButton>
                <input
                  className='settings__input settings__text'
                  placeholder='http://127.0.0.1:11434'
                  type='url'
                  id='url'
                  name='url'
                  value={values.url || ''}
                  onChange={handleChange}
                />
              </ButtonWrapperWithBackground>
              <ButtonWrapperWithBackground>
                <TextAndIconButton
                  className='text-and-icon-button'
                  text={t`model`}
                  style={{ marginLeft: '1rem' }}
                  isDisabled>
                  <NetworkIntelligenceIcon />
                </TextAndIconButton>
                <input
                  className='settings__input settings__text'
                  placeholder='llama3.1'
                  type='text'
                  id='model'
                  name='model'
                  value={values.model || ''}
                  onChange={handleChange}
                />
              </ButtonWrapperWithBackground>
            </>
          )}
          {provider === 'Embedded Ollama' && (
            <>
              <ButtonWrapperWithBackground
                onClick={() => dispatch(openElement('manageModelsPopup'))}>
                <TextAndIconButton
                  className='text-and-icon-button'
                  text={t`manage models`}
                  style={{ marginLeft: '1rem' }}
                  isDisabled>
                  <DownloadIcon />
                </TextAndIconButton>
                <p className='settings__text'>
                  {settings[provider]?.model || t`no model selected`}
                </p>
              </ButtonWrapperWithBackground>
            </>
          )}
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
      <Popup
        isOpened={
          isOpenLanguageSelectorPopup && Object.keys(LANGUAGES).length > 1
        }
        setOpened={() => dispatch(closeElement('languageSelectorPopup'))}
        styleWrapper={{ minWidth: '30.4352%' }}>
        {Object.entries(LANGUAGES).map(([key, value]) => (
          <SelectorOption
            key={value}
            state='simple'
            text={key}
            isActive={language === value}
            onClick={() => {
              setLanguageKey(key);
              handleLanguageChange(value);
              dispatch(closeElement('languageSelectorPopup'));
            }}
          />
        ))}
      </Popup>
      <Popup
        isOpened={
          isOpenProviderSelectorPopup && Object.keys(PROVIDERS).length > 1
        }
        setOpened={() => dispatch(closeElement('providerSelectorPopup'))}
        styleWrapper={{ minWidth: '30.4352%' }}>
        {Object.entries(PROVIDERS).map(([key, value]) => (
          <SelectorOption
            key={value}
            state='simple'
            text={key}
            isActive={provider === value}
            onClick={() => {
              handleProviderChange(value);
              dispatch(closeElement('providerSelectorPopup'));
            }}
          />
        ))}
      </Popup>
      <PopupWithSearch
        isOpened={isOpenTestListModelsPopup && Object.keys(MODELS).length > 1}
        setOpened={() => dispatch(closeElement('testListModelsPopup'))}
        styleWrapper={{ minWidth: '30.4352%' }}
        enableLazyLoading
        lazyLoadingThreshold={20}
        lazyLoadingMargin='100px'
        enableAnimation
        animationDuration={80}
        animationDelay={40}
        animationType='scaleIn'
        searchPlaceholder='Model...'
        searchDebounceMs={300}
        searchValue={searchValue}
        onSearchChange={setSearchValue}>
        {MODELS.data.ollama.map(({ name }) => (
          <SelectorOption
            key={name}
            state='available'
            text={name}
            onClick={() => {
              dispatch(closeElement('testListModelsPopup'));
            }}
          />
        ))}
      </PopupWithSearch>

      {/* ManageModels popup для Embedded Ollama */}
      {isOpenManageModelsPopup && (
        <ManageModels
          onClose={() => dispatch(closeElement('manageModelsPopup'))}
        />
      )}
    </section>
  );
}

export default Settings;
