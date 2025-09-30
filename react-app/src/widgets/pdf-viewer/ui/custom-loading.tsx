/**
 * @module CustomLoading
 * Компонент для отображения состояния загрузки PDF документа.
 * Используется в качестве fallback компонента для react-pdf Document
 * во время загрузки и рендеринга PDF файла.
 */

import Loader from '../../../shared/ui/loader';
import '../styles/custom-loading.scss';

/**
 * Компонент CustomLoading.
 *
 * Отображает индикатор загрузки во время обработки PDF документа.
 * Используется react-pdf для показа состояния загрузки документов.
 * Стилизован для центрирования и соответствия дизайн-системе приложения.
 *
 * @returns JSX элемент с индикатором загрузки.
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
function CustomLoading() {
  return (
    <div className='custom-loading'>
      <Loader />
    </div>
  );
}

export default CustomLoading;
