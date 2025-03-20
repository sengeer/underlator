import { useDispatch, useSelector } from 'react-redux';
import PdfIcon from '../../../shared/assets/icons/pdf-icon';
import SettingsIcon from '../../../shared/assets/icons/settings-icon';
import TranslateIcon from '../../../shared/assets/icons/translate-icon';
import useWindowSize from '../../../shared/lib/hooks/use-window-size';
import {
  openElement,
  closeElement,
  isElementOpen,
} from '../../../shared/model/element-state-slice';
import IconButton from '../../../shared/ui/icon-button';
import './index.scss';

interface iconsSet {
  [key: string]: {
    S: React.ReactNode;
    M: React.ReactNode;
    L: React.ReactNode;
  };
}

const iconsSet: iconsSet = {
  Translate: {
    S: <TranslateIcon width={32} height={32} />,
    M: <TranslateIcon width={40} height={40} />,
    L: <TranslateIcon width={48} height={48} />,
  },
  Pdf: {
    S: <PdfIcon width={32} height={32} />,
    M: <PdfIcon width={40} height={40} />,
    L: <PdfIcon width={48} height={48} />,
  },
  Settings: {
    S: <SettingsIcon width={32} height={32} />,
    M: <SettingsIcon width={40} height={40} />,
    L: <SettingsIcon width={48} height={48} />,
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
    const IconComponent = iconsSet[type][size];

    return IconComponent;
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
