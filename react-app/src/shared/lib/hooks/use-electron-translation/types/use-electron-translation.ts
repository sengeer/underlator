/**
 * @module UseElectronTranslationTypes
 * Типы для хука useElectronTranslation.
 */

/**
 * Интерфейс возвращаемых значений хука useElectronTranslation.
 */
export interface UseElectronTranslationReturn {
  /** Функция для синхронизации переводов с Electron main процессом */
  translateElectron: () => Promise<void>;
  /** Объект с переводами для Electron интерфейса */
  translations: {
    MENU: string;
    ABOUT: string;
    UNDO: string;
    REDO: string;
    CUT: string;
    COPY: string;
    PASTE: string;
    SELECT_ALL: string;
    QUIT: string;
    DOWNLOADING_OLLAMA: string;
    LOADING_APP: string;
  };
}
