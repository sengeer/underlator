import { useLingui } from '@lingui/react/macro';

export function useElectronTranslation() {
  const { t } = useLingui();

  const translateElectron = async () => {
    try {
      await window.electron.updateTranslations({
        about: t`About underlator`,
        undo: t`Undo`,
        redo: t`Redo`,
        cut: t`Cut`,
        copy: t`Copy`,
        paste: t`Paste`,
        selectAll: t`Select All`,
      });
    } catch (error) {
      console.error((error as Error).message);
    }
  };

  return {
    translateElectron,
  };
}
