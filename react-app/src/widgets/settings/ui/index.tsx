import './index.scss';
import { useLingui } from '@lingui/react/macro';
import { Trans } from '@lingui/react/macro';
import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CableIcon from '../../../shared/assets/icons/cable-icon';
import DownloadIcon from '../../../shared/assets/icons/download-icon';
import HttpIcon from '../../../shared/assets/icons/http-icon';
import LanguageIcon from '../../../shared/assets/icons/language-icon';
import NetworkIntelligenceIcon from '../../../shared/assets/icons/network-intelligence-icon';
import { useElectronModelsManagement } from '../../../shared/lib/hooks/use-electron-models-management';
import { useElectronTranslation } from '../../../shared/lib/hooks/use-electron-translation';
import { useFormAndValidation } from '../../../shared/lib/hooks/use-form-and-validation';
import { loadCatalog } from '../../../shared/lib/i18n';
import { ProviderType } from '../../../shared/lib/providers';
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
import Loader from '../../../shared/ui/loader';
import Popup from '../../../shared/ui/popup';
import SelectorPopup from '../../../shared/ui/selector-popup';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import TextButton from '../../../shared/ui/text-button/text-button';

const defaultLocale = import.meta.env.VITE_DEFAULT_LOCALE;

export interface PopupSelectorData {
  [key: string]: string;
}

const LANGUAGES: PopupSelectorData = {
  english: 'en',
  русский: 'ru',
};

const PROVIDERS: PopupSelectorData = {
  'Electron IPC': 'Electron IPC',
  Ollama: 'Ollama',
};

interface Settings {
  isOpened: boolean;
}

function Settings({ isOpened }: Settings) {
  const { values, handleChange, resetForm, setValues } = useFormAndValidation();

  const dispatch = useDispatch();
  const { provider, settings } = useSelector(selectProviderSettings);

  const {
    areRequiredModelsDownloaded,
    hasDownloadingModels,
    downloadModel,
    formatFileSize,
    getModelProgress,
    isModelDownloaded,
    isModelDownloading,
  } = useElectronModelsManagement();

  const [languageKey, setLanguageKey] = useState(() => {
    const localeFromStorage = getStorageWrite('locale');

    if (typeof localeFromStorage === 'string' && localeFromStorage !== '') {
      return Object.keys(LANGUAGES).find(
        (key) => LANGUAGES[key] === localeFromStorage
      );
    } else {
      const entry = Object.entries(LANGUAGES).find(
        ([key, val]) => val === defaultLocale
      );

      return entry ? entry[0] : '';
    }
  });

  const [language, setLanguage] = useState(() => {
    const localeFromStorage = getStorageWrite('locale');

    return typeof localeFromStorage === 'string' && localeFromStorage !== ''
      ? localeFromStorage
      : defaultLocale;
  });

  const { t } = useLingui();
  const { translateElectron } = useElectronTranslation();

  const isOpenLanguageSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'languageSelectorPopup')
  );

  const isOpenProviderSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'providerSelectorPopup')
  );

  const isOpenModelsManagementPopup = useSelector((state) =>
    isElementOpen(state, 'modelsManagementPopup')
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
          {provider === 'Electron IPC' && (
            <>
              <ButtonWrapperWithBackground
                onClick={() => dispatch(openElement('modelsManagementPopup'))}>
                <TextAndIconButton
                  className='text-and-icon-button'
                  text={t`downloading models`}
                  style={{ marginLeft: '1rem' }}
                  isDisabled>
                  <DownloadIcon />
                </TextAndIconButton>
                <p className='settings__text'>
                  {areRequiredModelsDownloaded ? t`done` : t`there downloads`}
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
      <SelectorPopup
        data={LANGUAGES}
        isOpened={isOpenLanguageSelectorPopup}
        setOpened={() => dispatch(closeElement('languageSelectorPopup'))}
        setSelectedKey={setLanguageKey}
        selectedValue={language}
        setSelectedValue={handleLanguageChange}
      />
      <SelectorPopup
        data={PROVIDERS}
        isOpened={isOpenProviderSelectorPopup}
        setOpened={() => dispatch(closeElement('providerSelectorPopup'))}
        setSelectedKey={() => {}}
        selectedValue={provider}
        setSelectedValue={handleProviderChange}
      />

      {/* Models download pop-up */}
      <Popup
        isOpened={isOpenModelsManagementPopup}
        setOpened={() => dispatch(closeElement('modelsManagementPopup'))}>
        <div className='settings__models-management'>
          <div className='settings__title-wrapper'>
            <p className='settings__models-description'>
              <Trans>
                Download both or one of the models to enable offline
                translation.
              </Trans>
            </p>
          </div>

          <div className='settings__models-list'>
            {/* EN-RU model */}
            <div className='settings__model-item'>
              <div className='settings__model-item-row'>
                <h4 className='settings__model-name'>
                  <Trans>english → russian</Trans>
                </h4>
                <p className='settings__model-description'>opus-mt-en-ru</p>
              </div>

              {/* Download progress */}
              {isModelDownloading('opus-mt-en-ru') && (
                <div className='settings__model-progress'>
                  {(() => {
                    const progress = getModelProgress('opus-mt-en-ru');
                    if (progress) {
                      return (
                        <>
                          <div className='settings__progress-bar'>
                            <div
                              className='settings__progress-fill'
                              style={{ width: `${progress.overallProgress}%` }}
                            />
                          </div>
                          <div className='settings__progress-info'>
                            <span>{Math.round(progress.overallProgress)}%</span>
                            <span>
                              {formatFileSize(progress.downloadedSize)} /{' '}
                              {formatFileSize(progress.totalSize)}
                            </span>
                          </div>
                          <p className='settings__progress-file'>
                            {progress.currentFile} ({progress.completedFiles}/
                            {progress.totalFiles})
                          </p>
                        </>
                      );
                    }
                    return <Loader />;
                  })()}
                </div>
              )}

              {/* Action button */}
              <div className='settings__model-item-row'>
                {isModelDownloaded('opus-mt-en-ru') && (
                  <p className='settings__model-status settings__model-status_success'>
                    <Trans>downloaded</Trans>
                  </p>
                )}
                {isModelDownloading('opus-mt-en-ru') && (
                  <p className='settings__model-status settings__model-status_loading'>
                    <Trans>downloading...</Trans>
                  </p>
                )}
                {!isModelDownloaded('opus-mt-en-ru') &&
                  !isModelDownloading('opus-mt-en-ru') && (
                    <p className='settings__model-status settings__model-status_error'>
                      <Trans>not downloaded</Trans>
                    </p>
                  )}
                {!isModelDownloaded('opus-mt-en-ru') &&
                  !isModelDownloading('opus-mt-en-ru') && (
                    <TextButton
                      onClick={() => downloadModel('opus-mt-en-ru')}
                      className='settings__download-btn'>
                      <Trans>download</Trans>
                    </TextButton>
                  )}
                {isModelDownloading('opus-mt-en-ru') && (
                  <TextButton isDisabled className='settings__download-btn'>
                    <Trans>downloading...</Trans>
                  </TextButton>
                )}
              </div>
            </div>

            {/* RU-EN model */}
            <div className='settings__model-item'>
              <div className='settings__model-item-row'>
                <h4 className='settings__model-name'>
                  <Trans>russian → english</Trans>
                </h4>
                <p className='settings__model-description'>opus-mt-ru-en</p>
              </div>

              {/* Download progress */}
              {isModelDownloading('opus-mt-ru-en') && (
                <div className='settings__model-progress'>
                  {(() => {
                    const progress = getModelProgress('opus-mt-ru-en');
                    if (progress) {
                      return (
                        <>
                          <div className='settings__progress-bar'>
                            <div
                              className='settings__progress-fill'
                              style={{ width: `${progress.overallProgress}%` }}
                            />
                          </div>
                          <div className='settings__progress-info'>
                            <span>{Math.round(progress.overallProgress)}%</span>
                            <span>
                              {formatFileSize(progress.downloadedSize)} /{' '}
                              {formatFileSize(progress.totalSize)}
                            </span>
                          </div>
                          <p className='settings__progress-file'>
                            {progress.currentFile} ({progress.completedFiles}/
                            {progress.totalFiles})
                          </p>
                        </>
                      );
                    }
                    return <Loader />;
                  })()}
                </div>
              )}

              {/* Action button */}
              <div className='settings__model-item-row'>
                {isModelDownloaded('opus-mt-ru-en') && (
                  <p className='settings__model-status settings__model-status_success'>
                    <Trans>downloaded</Trans>
                  </p>
                )}
                {isModelDownloading('opus-mt-ru-en') && (
                  <p className='settings__model-status settings__model-status_loading'>
                    <Trans>downloading...</Trans>
                  </p>
                )}
                {!isModelDownloaded('opus-mt-ru-en') &&
                  !isModelDownloading('opus-mt-ru-en') && (
                    <p className='settings__model-status settings__model-status_error'>
                      <Trans>not downloaded</Trans>
                    </p>
                  )}
                {!isModelDownloaded('opus-mt-ru-en') &&
                  !isModelDownloading('opus-mt-ru-en') && (
                    <TextButton
                      onClick={() => downloadModel('opus-mt-ru-en')}
                      className='settings__download-btn'>
                      <Trans>download</Trans>
                    </TextButton>
                  )}
                {isModelDownloading('opus-mt-ru-en') && (
                  <TextButton isDisabled className='settings__download-btn'>
                    <Trans>downloading...</Trans>
                  </TextButton>
                )}
              </div>
            </div>
          </div>

          {/* General status: Download translation models to use offline translation. Both models are required for bidirectional translation. */}
          <div className='settings__models-summary'>
            {areRequiredModelsDownloaded && (
              <p className='settings__summary-success'>
                <Trans>All models downloaded.</Trans>
              </p>
            )}
            {!areRequiredModelsDownloaded && (
              <p className='settings__summary-info'>
                <Trans>
                  Both models are needed to translate en to ru and ru to en.
                </Trans>
              </p>
            )}
          </div>
        </div>
      </Popup>
    </section>
  );
}

export default Settings;
