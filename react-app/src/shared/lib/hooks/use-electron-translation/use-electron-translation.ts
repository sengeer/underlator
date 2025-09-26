import { useLingui } from '@lingui/react/macro';

function useElectronTranslation() {
  const { t } = useLingui();

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
  };

  async function translateElectron() {
    try {
      await window.electron.updateTranslations(translations);
    } catch (error) {
      console.error((error as Error).message);
    }
  }

  return {
    translateElectron,
    translations,
  };
}

export default useElectronTranslation;
