import { useDispatch, useSelector } from 'react-redux';
import PdfIconL from '../../shared/assets/icons/pdf-icon-l';
import PdfIconM from '../../shared/assets/icons/pdf-icon-m';
import SettingsIconL from '../../shared/assets/icons/settings-icon-l';
import SettingsIconM from '../../shared/assets/icons/settings-icon-m';
import TranslateIconL from '../../shared/assets/icons/translate-icon-l';
import TranslateIconM from '../../shared/assets/icons/translate-icon-m';
import useWindowSize from '../../shared/lib/hooks/use-window-size/use-window-size';
import {
  openElement,
  closeElement,
  isElementOpen,
} from '../../shared/model/element-state-slice';
import IconButton from '../../shared/ui/icon-button';
import './index.scss';

function SideNavigate() {
  const dispatch = useDispatch();

  const isOpenTextTranslationSection = useSelector((state) =>
    isElementOpen(state, 'textTranslationSection')
  );

  const isOpenPdfTranslationSection = useSelector((state) =>
    isElementOpen(state, 'pdfTranslationSection')
  );

  const isOpenSettingsSection = useSelector((state) =>
    isElementOpen(state, 'settingsSection')
  );

  const { width } = useWindowSize();

  const isMobile = width <= 768;

  return (
    <aside className='side-navigate'>
      <IconButton
        isActiveStyle={isOpenTextTranslationSection}
        onClick={() => {
          dispatch(openElement('textTranslationSection'));
          dispatch(closeElement('pdfTranslationSection'));
          dispatch(closeElement('settingsSection'));
        }}>
        {isMobile ? <TranslateIconM /> : <TranslateIconL />}
      </IconButton>
      <IconButton
        isActiveStyle={isOpenPdfTranslationSection}
        onClick={() => {
          dispatch(openElement('pdfTranslationSection'));
          dispatch(closeElement('textTranslationSection'));
          dispatch(closeElement('settingsSection'));
        }}>
        {isMobile ? <PdfIconM /> : <PdfIconL />}
      </IconButton>
      <IconButton
        isActiveStyle={isOpenSettingsSection}
        onClick={() => {
          dispatch(openElement('settingsSection'));
          dispatch(closeElement('textTranslationSection'));
          dispatch(closeElement('pdfTranslationSection'));
        }}>
        {isMobile ? <SettingsIconM /> : <SettingsIconL />}
      </IconButton>
    </aside>
  );
}

export default SideNavigate;
