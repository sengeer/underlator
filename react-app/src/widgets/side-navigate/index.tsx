import { useDispatch, useSelector } from 'react-redux';
import PdfIconL from '../../shared/assets/icons/pdf-icon-l';
import PdfIconM from '../../shared/assets/icons/pdf-icon-m';
import PdfIconS from '../../shared/assets/icons/pdf-icon-s';
import SettingsIconL from '../../shared/assets/icons/settings-icon-l';
import SettingsIconM from '../../shared/assets/icons/settings-icon-m';
import SettingsIconS from '../../shared/assets/icons/settings-icon-s';
import TranslateIconL from '../../shared/assets/icons/translate-icon-l';
import TranslateIconM from '../../shared/assets/icons/translate-icon-m';
import TranslateIconS from '../../shared/assets/icons/translate-icon-s';
import useWindowSize from '../../shared/lib/hooks/use-window-size';
import {
  openElement,
  closeElement,
  isElementOpen,
} from '../../shared/model/element-state-slice';
import IconButton from '../../shared/ui/icon-button';
import './index.scss';

interface icons {
  [key: string]: {
    S: React.FC;
    M: React.FC;
    L: React.FC;
  };
}

const icons: icons = {
  Translate: {
    S: TranslateIconS,
    M: TranslateIconM,
    L: TranslateIconL,
  },
  Pdf: {
    S: PdfIconS,
    M: PdfIconM,
    L: PdfIconL,
  },
  Settings: {
    S: SettingsIconS,
    M: SettingsIconM,
    L: SettingsIconL,
  },
};

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

  const hasSizeS = width <= 768;
  const hasSizeM = width <= 1024;

  function Icon({ type }: { type: string }) {
    const size = hasSizeS ? 'S' : hasSizeM ? 'M' : 'L';
    const IconComponent = icons[type][size];

    return <IconComponent />;
  }

  return (
    <aside className='side-navigate'>
      <IconButton
        isActiveStyle={isOpenTextTranslationSection}
        onClick={() => {
          dispatch(openElement('textTranslationSection'));
          dispatch(closeElement('pdfTranslationSection'));
          dispatch(closeElement('settingsSection'));
        }}>
        <Icon type='Translate' />
      </IconButton>
      <IconButton
        isActiveStyle={isOpenPdfTranslationSection}
        onClick={() => {
          dispatch(openElement('pdfTranslationSection'));
          dispatch(closeElement('textTranslationSection'));
          dispatch(closeElement('settingsSection'));
        }}>
        <Icon type='Pdf' />
      </IconButton>
      <IconButton
        isActiveStyle={isOpenSettingsSection}
        onClick={() => {
          dispatch(openElement('settingsSection'));
          dispatch(closeElement('textTranslationSection'));
          dispatch(closeElement('pdfTranslationSection'));
        }}>
        <Icon type='Settings' />
      </IconButton>
    </aside>
  );
}

export default SideNavigate;
