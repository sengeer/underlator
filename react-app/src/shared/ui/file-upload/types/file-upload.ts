/**
 * @module FileUploadTypes
 * Типы для компонента FileUpload.
 */

/**
 * Пропсы для компонента FileUpload.
 */
export interface FileUploadProps {
  /** Управление отображением формы загрузки */
  isOpened: boolean;
  /** Общий обработчик выбора файла для клика и drag-and-drop */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
