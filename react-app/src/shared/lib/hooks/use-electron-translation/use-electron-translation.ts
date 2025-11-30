/**
 * @module UseElectronTranslation
 * Хук UseElectronTranslation для синхронизации переводов между React приложением и Electron main процессом.
 */

import { useLingui } from '@lingui/react/macro';
import { useDispatch } from 'react-redux';
import callANotificationWithALog from '../../utils/call-a-notification-with-a-log';
import { UseElectronTranslationReturn } from './types/use-electron-translation';

/**
 * Хук для работы с переводами Electron интерфейса.
 *
 * Предоставляет механизм синхронизации локализованных строк между React приложением
 * и Electron main процессом. Используется для обновления переводов в меню приложения,
 * splash screen и других элементах интерфейса Electron.
 *
 * @returns Объект с функцией синхронизации переводов и объектом переводов.
 *
 * @example
 * // Базовое использование в компоненте
 * function MyComponent() {
 *   const { translateElectron, translations } = useElectronTranslation();
 *
 *   useEffect(() => {
 *     translateElectron();
 *   }, []);
 *
 *   return <div>{translations.MENU}</div>;
 * }
 *
 * @example
 * // Использование при смене языка
 * function LanguageSelector() {
 *   const { translateElectron } = useElectronTranslation();
 *
 *   const handleLanguageChange = (lang: string) => {
 *     loadCatalog(lang);
 *     translateElectron(); // Обновляем переводы в Electron
 *   };
 * }
 */
function useElectronTranslation(): UseElectronTranslationReturn {
  const { t } = useLingui();
  const dispatch = useDispatch();

  // Создание объекта переводов для Electron интерфейса
  // Используется для локализации меню, splash screen и других элементов
  const translations = {
    MENU: t`Menu`,
    ABOUT: t`About Underlator`,
    UNDO: t`Undo`,
    REDO: t`Redo`,
    CUT: t`Cut`,
    COPY: t`Copy`,
    PASTE: t`Paste`,
    SELECT_ALL: t`Select All`,
    QUIT: t`Quit`,
    DOWNLOADING_OLLAMA: t`Downloading Ollama...`,
    LOADING_APP: t`Loading App...`,
    GETTING_CATALOG: t`Getting model catalog...`,
    GB: t`GB`,
    OK: t`ok!`,
    RAM: t`RAM`,
    INSUFFICIENT_RAM: t`insufficient RAM`,
  };

  /**
   * Синхронизирует переводы с Electron main процессом.
   *
   * Отправляет актуальные переводы в main процесс через IPC для обновления
   * локализованных строк в меню приложения и других элементах интерфейса.
   * Обрабатывает ошибки синхронизации без прерывания работы приложения.
   *
   * @returns Promise, который разрешается после успешной синхронизации.
   *
   * @throws {Error} Логирует ошибки в консоль, но не прерывает выполнение.
   */
  async function translateElectron(): Promise<void> {
    try {
      await window.electron.updateTranslations(translations);
    } catch (error) {
      callANotificationWithALog(dispatch, t`Failed to translate app`, error);
    }
  }

  return {
    translateElectron,
    translations,
  };
}

export default useElectronTranslation;
