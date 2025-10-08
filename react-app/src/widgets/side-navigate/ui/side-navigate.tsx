/**
 * @module SideNavigate
 * Компонент боковой навигации для переключения между основными секциями приложения.
 *
 * Компонент интегрируется с системой управления состоянием элементов через
 * element-state-slice для синхронизации с остальным приложением.
 */

import { useDispatch, useSelector } from 'react-redux';
import PdfIcon from '../../../shared/assets/icons/pdf-icon';
import SettingsIcon from '../../../shared/assets/icons/settings-icon';
import TranslateIcon from '../../../shared/assets/icons/translate-icon';
import WithAdaptiveSize from '../../../shared/lib/hocs/with-adaptive-size/with-adaptive-size';
import {
  openElement,
  closeElement,
  isElementOpen,
} from '../../../shared/models/element-state-slice';
import IconButton from '../../../shared/ui/icon-button';
import '../styles/side-navigate.scss';

/**
 * Компонент боковой навигации.
 *
 * Использует адаптивные иконки через WithAdaptiveSize HOC для корректного отображения
 * на различных размерах экрана. Состояние активных кнопок синхронизируется с Redux store
 * через селекторы isElementOpen.
 *
 * Навигационные секции:
 * - textTranslationSection: Секция перевода текста.
 * - pdfTranslationSection: Секция работы с PDF документами.
 * - settingsSection: Секция настроек приложения.
 *
 * @returns JSX элемент с навигационной панелью.
 *
 * @example
 * // Использование в Main компоненте
 * <main className='main'>
 *   <SideNavigate />
 *   <TextTranslator isOpened={isOpenTextTranslationSection} />
 *   <PdfViewer isOpened={isOpenPdfTranslationSection} />
 *   <Settings isOpened={isOpenSettingsSection} />
 * </main>
 */
function SideNavigate() {
  const dispatch = useDispatch();

  // Получение состояния видимости секции перевода текста из Redux store
  const isOpenTextTranslationSection = useSelector((state) =>
    isElementOpen(state, 'textTranslationSection')
  );

  // Получение состояния видимости секции работы с PDF из Redux store
  const isOpenPdfTranslationSection = useSelector((state) =>
    isElementOpen(state, 'pdfTranslationSection')
  );

  // Получение состояния видимости секции настроек из Redux store
  const isOpenSettingsSection = useSelector((state) =>
    isElementOpen(state, 'settingsSection')
  );

  return (
    <aside className='side-navigate'>
      {/* Кнопка переключения на секцию перевода текста */}
      <IconButton
        isActiveStyle={isOpenTextTranslationSection}
        onClick={() => {
          dispatch(openElement('textTranslationSection'));
          dispatch(closeElement('pdfTranslationSection'));
          dispatch(closeElement('settingsSection'));
        }}>
        <WithAdaptiveSize WrappedComponent={TranslateIcon} />
      </IconButton>

      {/* Кнопка переключения на секцию работы с PDF */}
      <IconButton
        isActiveStyle={isOpenPdfTranslationSection}
        onClick={() => {
          dispatch(openElement('pdfTranslationSection'));
          dispatch(closeElement('textTranslationSection'));
          dispatch(closeElement('settingsSection'));
        }}>
        <WithAdaptiveSize WrappedComponent={PdfIcon} />
      </IconButton>

      {/* Кнопка переключения на секцию настроек */}
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
