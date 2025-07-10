import { useDispatch, useSelector } from 'react-redux';
import PdfIcon from '../../../shared/assets/icons/pdf-icon';
import SettingsIcon from '../../../shared/assets/icons/settings-icon';
import TranslateIcon from '../../../shared/assets/icons/translate-icon';
import WithAdaptiveSize from '../../../shared/lib/HOCs/with-adaptive-size';
import {
  openElement,
  closeElement,
  isElementOpen,
} from '../../../shared/model/element-state-slice';
import IconButton from '../../../shared/ui/icon-button';
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

  return (
    <aside className='side-navigate'>
      <IconButton
        isActiveStyle={isOpenTextTranslationSection}
        onClick={() => {
          dispatch(openElement('textTranslationSection'));
          dispatch(closeElement('pdfTranslationSection'));
          dispatch(closeElement('settingsSection'));
        }}>
        <WithAdaptiveSize WrappedComponent={TranslateIcon} />
      </IconButton>
      <IconButton
        isActiveStyle={isOpenPdfTranslationSection}
        onClick={() => {
          dispatch(openElement('pdfTranslationSection'));
          dispatch(closeElement('textTranslationSection'));
          dispatch(closeElement('settingsSection'));
        }}>
        <WithAdaptiveSize WrappedComponent={PdfIcon} />
      </IconButton>
      <IconButton
        isActiveStyle={isOpenSettingsSection}
        onClick={() => {
          dispatch(openElement('settingsSection'));
          dispatch(closeElement('textTranslationSection'));
          dispatch(closeElement('pdfTranslationSection'));
        }}>
        <WithAdaptiveSize WrappedComponent={SettingsIcon} />
      </IconButton>
    </aside>
  );
}

export default SideNavigate;
