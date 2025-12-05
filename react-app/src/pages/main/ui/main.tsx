/**
 * @module Main
 * Главный компонент приложения.
 */

import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, Activity } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import useElectronTranslation from '../../../shared/lib/hooks/use-electron-translation';
import {
  isElementOpen,
  openElement,
  closeElement,
} from '../../../shared/models/element-state-slice';
import {
  selectThemes,
  setActiveTheme,
} from '../../../shared/models/themes-slice';
import {
  setSourceLanguage,
  setTargetLanguage,
} from '../../../shared/models/translation-languages-slice';
import ToastContainer from '../../../shared/ui/toast';
import Chat from '../../../widgets/chat';
import PdfViewer from '../../../widgets/pdf-viewer';
import Settings from '../../../widgets/settings';
import SideNavigate from '../../../widgets/side-navigate/';
import TextTranslator from '../../../widgets/text-translator';
import { BOOSTY_DONATE_URL } from '../constants/donation';
import { useAppLaunches } from '../hooks/use-app-launches';
import { selectSplashVisible } from '../models/splash-screen-ipc-slice';
import Donation from './donation';
import SplashScreen from './splash-screen';
import '../styles/main.scss';

/**
 * Главный компонент приложения Main.
 *
 * Управляет отображением основного интерфейса приложения, включая splash screen и основные виджеты.
 * Использует Redux для управления состоянием видимости секций и splash screen.
 * Автоматически синхронизирует переводы с Electron при монтировании.
 *
 * @returns JSX элемент.
 *
 * @example
 * // Базовое использование в App компоненте
 * <I18nProvider i18n={i18n}>
 *   <Main />
 * </I18nProvider>
 *
 * @example
 * // Использование с дополнительными провайдерами
 * <Provider store={store}>
 *   <I18nProvider i18n={i18n}>
 *     <Main />
 *   </I18nProvider>
 * </Provider>
 */
function Main() {
  const { t } = useLingui();
  const dispatch = useDispatch();

  // Получение состояния видимости TextTranslator из Redux store
  const isOpenTextTranslatorSection = useSelector((state) =>
    isElementOpen(state, 'textTranslatorSection')
  );

  // Получение состояния видимости PdfViewer из Redux store
  const isOpenPdfViewerSection = useSelector((state) =>
    isElementOpen(state, 'pdfViewerSection')
  );

  // Получение состояния видимости Settings из Redux store
  const isOpenSettingsSection = useSelector((state) =>
    isElementOpen(state, 'settingsSection')
  );

  // Получение состояния видимости SplashScreen из Redux store
  const isSplashVisible = useSelector(selectSplashVisible);

  // Получение состояния видимости Chat из Redux store
  const isOpenChatSection = useSelector((state) =>
    isElementOpen(state, 'chatSection')
  );

  // Получение состояния видимости модального окна доната из Redux store
  const isOpenDonationPopup = useSelector((state) =>
    isElementOpen(state, 'donationPopup')
  );

  // Хук для отслеживания открытий приложения и показа модального окна доната
  const { shouldShowPopup, dismissPopup } = useAppLaunches();

  // Управление состоянием модального окна доната через Redux
  useEffect(() => {
    if (shouldShowPopup) {
      dispatch(openElement('donationPopup'));
    }
  }, [shouldShowPopup, dispatch]);

  // Обработчик закрытия модального окна
  function handleCloseDonationPopup() {
    dispatch(closeElement('donationPopup'));
    dismissPopup();
  }

  // Обработчик открытия страницы доната
  function handleDonate() {
    window.open(BOOSTY_DONATE_URL, '_blank', 'noopener,noreferrer');
    handleCloseDonationPopup();
  }

  // Хук для работы с переводами Electron
  // Предоставляет функцию синхронизации переводов с main процессом
  const { translateElectron } = useElectronTranslation();

  // Получение состояния тем из Redux store
  const themes = useSelector(selectThemes);

  // Синхронизация переводов Electron при монтировании компонента
  // Обеспечивает корректное отображение локализованных строк в меню и интерфейсе
  useEffect(() => {
    translateElectron();
  }, [translateElectron]);

  // Применение активной темы при монтировании компонента
  // Обеспечивает восстановление выбранной темы после перезагрузки приложения
  // и применение темы сразу после восстановления состояния из redux-persist
  useEffect(() => {
    if (themes.activeTheme) {
      dispatch(setActiveTheme(themes.activeTheme));
    }
  }, [dispatch, themes.activeTheme]);

  // Ref для отслеживания первого запуска эффекта
  // Предотвращает повторное срабатывание эффекта при изменении зависимостей
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
  }, []);

  useEffect(() => {
    dispatch(setSourceLanguage(t`english`));
    dispatch(setTargetLanguage(t`russian`));
  }, [t]);

  return (
    <main className='main'>
      {/* SplashScreen отображается первым для показа статуса загрузки всего приложения */}
      <SplashScreen />
      {/* Основной интерфейс показывается только после завершения загрузки приложения */}
      {isSplashVisible ? null : (
        <>
          {/* Контейнер для отображения toast-уведомлений */}
          <ToastContainer />
          {/* Навигационная панель для переключения между компонентами */}
          <SideNavigate />
          {/* Виджет чата */}
          <Activity mode={isOpenChatSection ? 'visible' : 'hidden'}>
            <Chat />
          </Activity>
          {/* Виджет перевода текста */}
          <Activity mode={isOpenTextTranslatorSection ? 'visible' : 'hidden'}>
            <TextTranslator />
          </Activity>
          {/* Виджет просмотра и перевода PDF */}
          <PdfViewer isOpened={isOpenPdfViewerSection} />
          {/* Виджет настроек */}
          <Activity mode={isOpenSettingsSection ? 'visible' : 'hidden'}>
            <Settings />
          </Activity>
          {/* Модальное окно доната */}
          <Donation
            isOpened={shouldShowPopup || isOpenDonationPopup}
            setOpened={handleCloseDonationPopup}
            onDonate={handleDonate}
          />
        </>
      )}
    </main>
  );
}

export default Main;
