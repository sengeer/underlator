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
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import packageJson from '../../../../package.json';
import BalanceIcon from '../../../shared/assets/icons/balance-icon';
import CableIcon from '../../../shared/assets/icons/cable-icon';
import CommitIcon from '../../../shared/assets/icons/commit-icon';
import DownloadIcon from '../../../shared/assets/icons/download-icon';
import HttpIcon from '../../../shared/assets/icons/http-icon';
import LanguageIcon from '../../../shared/assets/icons/language-icon';
import MailIcon from '../../../shared/assets/icons/mail-icon';
import NetworkIntelligenceIcon from '../../../shared/assets/icons/network-intelligence-icon';
import TextIncreaseIcon from '../../../shared/assets/icons/text-increase-icon';
import TrophyIcon from '../../../shared/assets/icons/trophy-icon';
import UnderlatorIcon from '../../../shared/assets/icons/underlator-icon';
import {
  DEFAULT_LOCALE,
  DEFAULT_RAG_TOP_K,
  DEFAULT_RAG_SIMILARITY_THRESHOLD,
  DEFAULT_RAG_CHUNK_SIZE,
} from '../../../shared/lib/constants';
import useElectronTranslation from '../../../shared/lib/hooks/use-electron-translation';
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
  updateRagSettings,
} from '../../../shared/models/provider-settings-slice';
import type { RagSettings } from '../../../shared/models/provider-settings-slice/types/provider-settings-slice';
import ButtonWrapperWithBackground from '../../../shared/ui/button-wrapper-with-background';
import Grid from '../../../shared/ui/grid/grid';
import Popup from '../../../shared/ui/popup';
import SelectorOption from '../../../shared/ui/selector-option/';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import TextButton from '../../../shared/ui/text-button';
import { LANGUAGES, PROVIDERS } from '../constants/settings';
import type { SettingsFormData } from '../types/settings';
import ManageModels from './manage-embedded-ollama';
import Tests from './tests';
import Themes from './themes';

/**
 * Компонент Settings.
 *
 * Реализует основной интерфейс настроек приложения.
 *
 * @param isOpened - Открыт ли компонент настроек.
 * @returns JSX элемент с интерфейсом настроек.
 */
function Settings() {
  const dispatch = useDispatch();
  const { provider, settings, rag } = useSelector(selectProviderSettings);

  /**
   * Инициализация формы с react-hook-form.
   * Использует значения по умолчанию из Redux store.
   */
  const {
    register,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SettingsFormData>({
    defaultValues: {
      url: settings[provider]?.url || '',
      model: settings[provider]?.model || '',
      topK: String(rag?.topK ?? DEFAULT_RAG_TOP_K),
      similarityThreshold: String(
        rag?.similarityThreshold ?? DEFAULT_RAG_SIMILARITY_THRESHOLD
      ),
      chunkSize: String(rag?.chunkSize ?? DEFAULT_RAG_CHUNK_SIZE),
    },
    mode: 'onChange',
  });

  /**
   * Создает обработчик onChange с жёсткой валидацией для числовых полей.
   * Автоматически обрезает значение до допустимого диапазона.
   *
   * @param fieldName - Имя поля формы
   * @param min - Минимальное значение
   * @param max - Максимальное значение
   * @returns Объект с обработчиками для register
   */
  const createNumberFieldRegister = (
    fieldName: keyof SettingsFormData,
    min: number,
    max: number
  ) => {
    return register(fieldName, {
      required: `${fieldName} is required`,
      min,
      max,
      valueAsNumber: true,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Разрешает пустую строку для возможности очистки поля
        if (value === '') {
          return;
        }
        const numValue = parseFloat(value);
        // Если значение не число, игнорирует ввод
        if (isNaN(numValue)) {
          e.target.value = '';
          setValue(fieldName, '');
          return;
        }
        // Обрезает значение до допустимого диапазона
        const clampedValue = Math.max(min, Math.min(max, numValue));
        if (clampedValue !== numValue) {
          e.target.value = String(clampedValue);
          setValue(fieldName, String(clampedValue), { shouldValidate: true });
        }
      },
    });
  };

  // Отслеживает изменения всех полей формы
  const formValues = watch();

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
  const isOpenManageEmbeddingModelsPopup = useSelector((state) =>
    isElementOpen(state, 'manageEmbeddingModelsPopup')
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
   * Синхронизация формы с настройками провайдера из Redux.
   * Обновляет форму при изменении провайдера или настроек RAG.
   */
  useEffect(() => {
    if (!provider || !settings[provider]) {
      reset({
        url: '',
        model: '',
        topK: String(DEFAULT_RAG_TOP_K),
        similarityThreshold: String(DEFAULT_RAG_SIMILARITY_THRESHOLD),
        chunkSize: String(DEFAULT_RAG_CHUNK_SIZE),
      });
      return;
    }

    reset({
      url: settings[provider].url || '',
      model: settings[provider].model || '',
      topK: String(rag?.topK ?? DEFAULT_RAG_TOP_K),
      similarityThreshold: String(
        rag?.similarityThreshold ?? DEFAULT_RAG_SIMILARITY_THRESHOLD
      ),
      chunkSize: String(rag?.chunkSize ?? DEFAULT_RAG_CHUNK_SIZE),
    });
  }, [
    provider,
    rag?.topK,
    rag?.similarityThreshold,
    rag?.chunkSize,
    settings,
    reset,
  ]);

  /**
   * Автоматическое сохранение изменений формы в Redux store.
   * Использует watch для отслеживания изменений и синхронизации с Redux.
   */
  useEffect(() => {
    if (!provider) {
      return;
    }

    const subscription = watch((data, { name }) => {
      if (!name) return;

      // Обновление настроек провайдера
      if (name === 'url' || name === 'model') {
        const providerPayload: Partial<ProviderSettings> = {};
        const currentUrl = settings[provider]?.url || '';
        const currentModel = settings[provider]?.model || '';

        if (
          name === 'url' &&
          data.url !== undefined &&
          data.url !== currentUrl
        ) {
          providerPayload.url = String(data.url);
        }
        if (
          name === 'model' &&
          data.model !== undefined &&
          data.model !== currentModel
        ) {
          providerPayload.model = String(data.model);
        }

        if (Object.keys(providerPayload).length > 0) {
          dispatch(
            updateProviderSettings({ provider, settings: providerPayload })
          );
          dispatch(setTypeUse({ provider, typeUse: 'translation' }));
        }
      }

      // Обновление настроек RAG
      if (
        name === 'topK' ||
        name === 'similarityThreshold' ||
        name === 'chunkSize'
      ) {
        const ragPayload: Partial<RagSettings> = {};
        const currentTopK = rag?.topK ?? DEFAULT_RAG_TOP_K;
        const currentThreshold =
          rag?.similarityThreshold ?? DEFAULT_RAG_SIMILARITY_THRESHOLD;
        const currentChunkSize = rag?.chunkSize ?? DEFAULT_RAG_CHUNK_SIZE;

        if (name === 'topK' && data.topK !== undefined && data.topK !== '') {
          const parsedTopK = Number(data.topK);
          if (!Number.isNaN(parsedTopK) && parsedTopK !== currentTopK) {
            ragPayload.topK = parsedTopK;
          }
        }

        if (
          name === 'similarityThreshold' &&
          data.similarityThreshold !== undefined &&
          data.similarityThreshold !== ''
        ) {
          const parsedThreshold = Number(data.similarityThreshold);
          if (
            !Number.isNaN(parsedThreshold) &&
            parsedThreshold !== currentThreshold
          ) {
            ragPayload.similarityThreshold = parsedThreshold;
          }
        }

        if (
          name === 'chunkSize' &&
          data.chunkSize !== undefined &&
          data.chunkSize !== ''
        ) {
          const parsedChunk = Number(data.chunkSize);
          if (!Number.isNaN(parsedChunk) && parsedChunk !== currentChunkSize) {
            ragPayload.chunkSize = parsedChunk;
          }
        }

        if (Object.keys(ragPayload).length > 0) {
          dispatch(updateRagSettings(ragPayload));
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, provider, settings, rag, dispatch]);

  return (
    <section className='settings'>
      {import.meta.env.DEV && <Tests />}

      <div className='settings__header'>
        <TextAndIconButton
          text={t`donate`}
          onClick={() => dispatch(openElement('donationPopup'))}>
          <UnderlatorIcon width={24} height={24} />
        </TextAndIconButton>
        <TextAndIconButton text={`v${packageJson.version}`} isDisabled>
          <CommitIcon />
        </TextAndIconButton>
        <TextAndIconButton
          text={t`contact`}
          onClick={() => {
            window.location.href = 'mailto:fox8911@gmail.com';
          }}>
          <MailIcon />
        </TextAndIconButton>
      </div>
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
        <Trans>API configuration</Trans>
      </h2>
      <Grid columns={1}>
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
              {...register('url', {
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: 'Invalid URL format',
                },
              })}
            />
          </ButtonWrapperWithBackground>
        )}
        {provider === 'Ollama' && (
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
              {...register('model', {
                required: 'Model name is required',
              })}
            />
          </ButtonWrapperWithBackground>
        )}
        {provider === 'Embedded Ollama' && (
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
        )}
      </Grid>
      <h2 className='text-heading-l settings__title'>
        <Trans>RAG configuration</Trans>
      </h2>
      <Grid columns={2}>
        <ButtonWrapperWithBackground>
          <TextAndIconButton
            text={t`number of top results`}
            style={{ marginLeft: '1rem' }}
            isDisabled>
            <TrophyIcon />
          </TextAndIconButton>
          <input
            className='text-body-m settings__input settings__text'
            placeholder={DEFAULT_RAG_TOP_K.toString()}
            type='number'
            id='topK'
            min={1}
            max={100}
            {...createNumberFieldRegister('topK', 1, 100)}
          />
        </ButtonWrapperWithBackground>
        <ButtonWrapperWithBackground>
          <TextAndIconButton
            text={t`similarity threshold`}
            style={{ marginLeft: '1rem' }}
            isDisabled>
            <BalanceIcon />
          </TextAndIconButton>
          <input
            className='text-body-m settings__input settings__text'
            placeholder={DEFAULT_RAG_SIMILARITY_THRESHOLD.toString()}
            type='number'
            step='0.1'
            id='similarityThreshold'
            min={0}
            max={1}
            {...createNumberFieldRegister('similarityThreshold', 0, 1)}
          />
        </ButtonWrapperWithBackground>
        <ButtonWrapperWithBackground>
          <TextAndIconButton
            text={t`chunk size`}
            style={{ marginLeft: '1rem' }}
            isDisabled>
            <TextIncreaseIcon />
          </TextAndIconButton>
          <input
            className='text-body-m settings__input settings__text'
            placeholder={DEFAULT_RAG_CHUNK_SIZE.toString()}
            type='number'
            id='chunkSize'
            min={1}
            max={4096}
            {...createNumberFieldRegister('chunkSize', 1, 4096)}
          />
        </ButtonWrapperWithBackground>
        <ButtonWrapperWithBackground
          onClick={() => dispatch(openElement('manageEmbeddingModelsPopup'))}>
          <TextAndIconButton
            text={t`manage embedding models`}
            style={{ marginLeft: '1rem' }}
            isDisabled>
            <DownloadIcon />
          </TextAndIconButton>
          <p className='text-body-m settings__text'>
            {rag?.model || t`no model selected`}
          </p>
        </ButtonWrapperWithBackground>
      </Grid>
      <h2 className='text-heading-l settings__title'>
        <Trans>theme</Trans>
      </h2>
      <Themes />
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

      {/* ManageModels popup для провайдера Embedded Ollama */}
      <ManageModels
        mode='provider'
        isOpened={isOpenManageModelsPopup}
        onClose={() => dispatch(closeElement('manageModelsPopup'))}
      />
      {/* ManageModels popup для RAG */}
      <ManageModels
        mode='rag'
        isOpened={isOpenManageEmbeddingModelsPopup}
        onClose={() => dispatch(closeElement('manageEmbeddingModelsPopup'))}
      />
    </section>
  );
}

export default Settings;
