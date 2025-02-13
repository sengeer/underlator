import { useSelector } from 'react-redux';
import PdfTranslator from '../../../features/pdf-translator/ui';
import Settings from '../../../features/settings/ui';
import TextTranslator from '../../../features/text-translator/ui';
import { isElementOpen } from '../../../shared/model/element-state-slice';
import SideNavigate from '../../../widgets/side-navigate';
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
