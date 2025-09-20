import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useElectronTranslation } from '../../../shared/lib/hooks/use-electron-translation';
import { isElementOpen } from '../../../shared/models/element-state-slice';
import PdfViewer from '../../../widgets/pdf-viewer/ui';
import Settings from '../../../widgets/settings/ui';
import SideNavigate from '../../../widgets/side-navigate/ui';
import TextTranslator from '../../../widgets/text-translator/ui';
import { selectSplashVisible } from '../models/splash-screen-slice';
import SplashScreen from './splash-screen';
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

  const isSplashVisible = useSelector(selectSplashVisible);

  const { translateElectron } = useElectronTranslation();

  useEffect(() => {
    translateElectron();
  }, [translateElectron]);

  return (
    <main className='main'>
      <SplashScreen />
      {!isSplashVisible && (
        <>
          <SideNavigate />
          <TextTranslator isOpened={isOpenTextTranslationSection} />
          <PdfViewer isOpened={isOpenPdfTranslationSection} />
          <Settings isOpened={isOpenSettingsSection} />
        </>
      )}
    </main>
  );
}

export default Main;
