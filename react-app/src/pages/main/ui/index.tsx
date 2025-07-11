import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useElectronTranslation } from '../../../shared/lib/hooks/use-electron-translation';
import { isElementOpen } from '../../../shared/models/element-state-slice';
import PdfTranslator from '../../../widgets/pdf-translator/ui';
import Settings from '../../../widgets/settings/ui';
import SideNavigate from '../../../widgets/side-navigate/ui';
import TextTranslator from '../../../widgets/text-translator/ui';
import './index.scss';

function Main() {
  const isOpenTextTranslationSection = useSelector((state) =>
    isElementOpen(state, 'textTranslationSection')
  );

  const isOpenPdfTranslationSection = useSelector((state) =>
    isElementOpen(state, 'pdfTranslationSection')
  );

  const isOpenSettingsSection = useSelector((state) =>
    isElementOpen(state, 'settingsSection')
  );

  const { translateElectron } = useElectronTranslation();

  useEffect(() => {
    translateElectron();
  }, [translateElectron]);

  return (
    <main className='main'>
      <SideNavigate />
      <TextTranslator isOpened={isOpenTextTranslationSection} />
      <PdfTranslator isOpened={isOpenPdfTranslationSection} />
      <Settings isOpened={isOpenSettingsSection} />
    </main>
  );
}

export default Main;
