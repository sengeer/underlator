import { useLingui } from '@lingui/react/macro';

export function useElectronTranslation() {
  const { t } = useLingui();

  const translations = {
    MENU: t`Menu`,
    ABOUT: t`About underlator`,
    UNDO: t`Undo`,
    REDO: t`Redo`,
    CUT: t`Cut`,
    COPY: t`Copy`,
    PASTE: t`Paste`,
    SELECT_ALL: t`Select All`,
    QUIT: t`Quit`,
    DOWNLOADING_OLLAMA: t`Downloading Ollama...`,
    DOWNLOADING_APP: t`Downloading App...`,
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
