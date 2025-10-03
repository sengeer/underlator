/**
 * @module Main
 * Главный компонент приложения Main.
 */

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import useElectronTranslation from '../../../shared/lib/hooks/use-electron-translation';
import { isElementOpen } from '../../../shared/models/element-state-slice';
import ToastContainer from '../../../shared/ui/toast';
import PdfViewer from '../../../widgets/pdf-viewer';
import Settings from '../../../widgets/settings';
import SideNavigate from '../../../widgets/side-navigate/';
import TextTranslator from '../../../widgets/text-translator';
import { selectSplashVisible } from '../models/splash-screen-slice';
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
  // Получение состояния видимости TextTranslator из Redux store
  const isOpenTextTranslationSection = useSelector((state) =>
    isElementOpen(state, 'textTranslationSection')
  );

  // Получение состояния видимости PdfViewer из Redux store
  const isOpenPdfTranslationSection = useSelector((state) =>
    isElementOpen(state, 'pdfTranslationSection')
  );

  // Получение состояния видимости Settings из Redux store
  const isOpenSettingsSection = useSelector((state) =>
    isElementOpen(state, 'settingsSection')
  );

  // Получение состояния видимости SplashScreen из Redux store
  const isSplashVisible = useSelector(selectSplashVisible);

  // Хук для работы с переводами Electron
  // Предоставляет функцию синхронизации переводов с main процессом
  const { translateElectron } = useElectronTranslation();

  // Синхронизация переводов Electron при монтировании компонента
  // Обеспечивает корректное отображение локализованных строк в меню и интерфейсе
  useEffect(() => {
    translateElectron();
  }, [translateElectron]);

  return (
    <main className='main'>
      {/* SplashScreen отображается первым для показа статуса загрузки всего приложения */}
      <SplashScreen />
      {/* Основной интерфейс показывается только после завершения загрузки приложения */}
      {!isSplashVisible && (
        <>
          {/* Контейнер для отображения toast-уведомлений */}
          <ToastContainer />
          {/* Навигационная панель для переключения между компонентами */}
          <SideNavigate />
          {/* Виджет перевода текста */}
          <TextTranslator isOpened={isOpenTextTranslationSection} />
          {/* Виджет просмотра и перевода PDF */}
          <PdfViewer isOpened={isOpenPdfTranslationSection} />
          {/* Виджет настроек */}
          <Settings isOpened={isOpenSettingsSection} />
        </>
      )}
    </main>
  );
}

export default Main;
