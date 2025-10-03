/**
 * @module CustomErrorMessage
 * Компонент для отображения ошибки загрузки PDF документа.
 * Используется в качестве fallback компонента для react-pdf Document
 * при возникновении ошибок при загрузке или рендеринге PDF файла.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../../shared/models/notifications-slice/';
import '../styles/custom-error-message.scss';

/**
 * Компонент CustomErrorMessage.
 *
 * Отображает локализованное сообщение об ошибке загрузки PDF файла.
 * Используется react-pdf для показа ошибок при загрузке документов.
 * Стилизован для центрирования и соответствия дизайн-системе приложения.
 *
 * @returns JSX элемент с сообщением об ошибке.
 *
 * @example
 * // Использование в react-pdf Document
 * <Document
 *   file={file}
 *   error={<CustomErrorMessage />}
 *   loading={<CustomLoading />}
 * >
 *   {pages.map(page => <Page key={page.pageNumber} pageNumber={page.pageNumber} />)}
 * </Document>
 */
function CustomErrorMessage() {
  const dispatch = useDispatch();
  const { t } = useLingui();

  useEffect(() => {
    dispatch(
      addNotification({ type: 'error', message: t`❌ Failed to load PDF file` })
    );
  }, []);

  return (
    <div className='custom-error-message'>
      <Trans>failed to load PDF file</Trans>
    </div>
  );
}

export default CustomErrorMessage;
