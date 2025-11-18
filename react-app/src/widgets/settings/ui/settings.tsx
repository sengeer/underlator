/**
 * @module Settings
 * Основной компонент настроек приложения.
 *
 * Предоставляет интерфейс для настройки приложения. Интегрируется с Redux store для управления
 * состоянием настроек и синхронизации с остальным приложением.
 *
 * Компонент использует модальные окна для выбора опций и автоматически
 * сохраняет изменения в Redux store и localStorage. Поддерживает
 * валидацию форм и обработку ошибок.
 *
 * @example
 * // Использование в Main компоненте
 * <Settings isOpened={isOpenSettingsSection} />
 */

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
import SelectorOption from '../../../shared/ui/selector-option/';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import TextButton from '../../../shared/ui/text-button';
import { LANGUAGES, PROVIDERS } from '../constants/settings';
import ManageModels from './manage-embedded-ollama';
import Tests from './tests';

/**
 * Компонент Settings.
 *
 * Реализует основной интерфейс настроек приложения.
 *
 * @param isOpened - Открыт ли компонент настроек.
 * @returns JSX элемент с интерфейсом настроек.
 */
function Settings() {
  const { values, handleChange, resetForm, setValues } = useFormAndValidation();

  const dispatch = useDispatch();
  const { provider, settings } = useSelector(selectProviderSettings);

  /**
   * Ключ языка для отображения в интерфейсе.
   * Инициализируется из localStorage или использует значение по умолчанию.
   */
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

  /**
   * Код языка для использования в приложении.
   * Инициализируется из localStorage или использует значение по умолчанию.
   */
  const [language, setLanguage] = useState(() => {
    const localeFromStorage = getStorageWrite('locale');

    return typeof localeFromStorage === 'string' && localeFromStorage !== ''
      ? localeFromStorage
      : DEFAULT_LOCALE;
  });

  const { t } = useLingui();
  const { translateElectron } = useElectronTranslation();

  /**
   * Состояние открытия модального окна выбора языка.
   * Получается из Redux store для управления видимостью.
   */
  const isOpenLanguageSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'languageSelectorPopup')
  );

  /**
   * Состояние открытия модального окна выбора провайдера.
   * Получается из Redux store для управления видимостью.
   */
  const isOpenProviderSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'providerSelectorPopup')
  );

  /**
   * Состояние открытия модального окна управления моделями.
   * Получается из Redux store для управления видимостью.
   */
  const isOpenManageModelsPopup = useSelector((state) =>
    isElementOpen(state, 'manageModelsPopup')
  );

  /**
   * Обработчик изменения языка интерфейса.
   *
   * Обновляет состояние языка, загружает каталог переводов,
   * сохраняет выбор в localStorage и синхронизирует переводы
   * с Electron процессом.
   *
   * @param lang - Код языка для установки.
   */
  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      loadCatalog(lang);
      setStorageWrite('locale', lang);
      translateElectron();
    },
    [loadCatalog, translateElectron]
  );

  /**
   * Обработчик изменения провайдера LLM.
   *
   * Обновляет активный провайдер в Redux store.
   * Автоматически сбрасывает настройки формы при смене провайдера.
   *
   * @param newProvider - Новый провайдер для установки.
   */
  function handleProviderChange(newProvider: string) {
    dispatch(setProvider(newProvider as ProviderType));
  }

  /**
   * Автоматическое сохранение изменений формы в Redux store.
   *
   * Отслеживает изменения в полях формы и автоматически сохраняет
   * их в настройках провайдера. Устанавливает тип использования
   * как 'translation' для совместимости с существующей логикой.
   */
  useEffect(() => {
    if (provider && (values.url !== undefined || values.model !== undefined)) {
      dispatch(updateProviderSettings({ provider, settings: values }));
      dispatch(setTypeUse({ provider, typeUse: 'translation' }));
    }
  }, [values, provider, dispatch]);

  /**
   * Синхронизация формы с настройками провайдера.
   *
   * При изменении провайдера или инициализации компонента
   * загружает настройки из Redux store в форму. Если настройки
   * отсутствуют, сбрасывает форму к значениям по умолчанию.
   */
  useEffect(() => {
    if (provider && settings[provider]) {
      setValues({
        url: settings[provider].url || '',
        model: settings[provider].model || '',
      });
    } else {
      resetForm();
    }
  }, [provider, setValues, resetForm]);

  return (
    <section className='settings'>
      {import.meta.env.DEV && <Tests />}

      <div className='settings__container'>
        <div className='settings__column'>
          <h2 className='text-heading-l settings__title'>
            <Trans>main settings</Trans>
          </h2>
          <ButtonWrapperWithBackground
            onClick={() => dispatch(openElement('languageSelectorPopup'))}>
            <TextAndIconButton
              text={t`interface language`}
              style={{ marginLeft: '1rem' }}
              isDisabled>
              <LanguageIcon />
            </TextAndIconButton>
            <p className='text-body-m settings__text'>{languageKey}</p>
          </ButtonWrapperWithBackground>
          <h2 className='text-heading-l settings__title'>
            <Trans>api configuration</Trans>
          </h2>
          <ButtonWrapperWithBackground
            onClick={() => dispatch(openElement('providerSelectorPopup'))}>
            <TextAndIconButton
              text={t`provider`}
              style={{ marginLeft: '1rem' }}
              isDisabled>
              <CableIcon />
            </TextAndIconButton>
            <p className='text-body-m settings__text'>{provider}</p>
          </ButtonWrapperWithBackground>
          {provider === 'Ollama' && (
            <>
              <ButtonWrapperWithBackground>
                <TextAndIconButton
                  text={'url'}
                  style={{ marginLeft: '1rem' }}
                  isDisabled>
                  <HttpIcon />
                </TextAndIconButton>
                <input
                  className='text-body-m settings__input settings__text'
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
                  text={t`model`}
                  style={{ marginLeft: '1rem' }}
                  isDisabled>
                  <NetworkIntelligenceIcon />
                </TextAndIconButton>
                <input
                  className='text-body-m settings__input settings__text'
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
                  text={t`manage models`}
                  style={{ marginLeft: '1rem' }}
                  isDisabled>
                  <DownloadIcon />
                </TextAndIconButton>
                <p className='text-body-m settings__text'>
                  {settings[provider]?.model || t`no model selected`}
                </p>
              </ButtonWrapperWithBackground>
            </>
          )}
        </div>
        <div className='settings__column'>
          <h2 className='text-heading-l settings__title'>
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
            type='simple'
            key={value}
            onClick={() => {
              setLanguageKey(key);
              handleLanguageChange(value);
              dispatch(closeElement('languageSelectorPopup'));
            }}>
            <TextButton
              text={key}
              isDisabled
              isActiveStyle={language === value}
            />
          </SelectorOption>
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
            type='simple'
            key={value}
            onClick={() => {
              handleProviderChange(value);
              dispatch(closeElement('providerSelectorPopup'));
            }}>
            <TextButton
              text={key}
              isDisabled
              isActiveStyle={provider === value}
            />
          </SelectorOption>
        ))}
      </Popup>

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
