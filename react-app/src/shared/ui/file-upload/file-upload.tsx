/**
 * @module FileUpload
 * Drag-and-drop компонент выбора документа для PDF Viewer.
 *
 * Компонент служит точкой входа в режим анализа PDF, раскрывается поверх рабочей области
 * и синхронизирует пользовательский ввод с обработчиками `pdf-viewer`.
 */

import { Trans } from '@lingui/react/macro';
import { forwardRef } from 'react';
import { useState } from 'react';
import './styles/file-upload.scss';
import CloudIcon from '../../assets/icons/cloud-icon';
import { FileUploadProps } from './types/file-upload';

/**
 * Компонент drag-and-drop загрузки документов, интегрированный с `pdf-viewer`.
 *
 * Переиспользует единый обработчик `onChange`, применяемый и в нативном `<input type="file" />`,
 * и в событиях перетаскивания. Видимость контролируется родительскими виджетами.
 *
 * @param props - Пропсы компонента FileUpload.
 * @param ref - Проброшенный ref к нативному input, чтобы родитель мог инициировать выбор файла.
 * @returns JSX элемент формы загрузки.
 *
 * @example
 * <FileUpload
 *   isOpened={!file}
 *   onChange={onFileChange}
 *   ref={fileInputRef}
 * />
 */
const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  ({ isOpened, onChange }, ref) => {
    const [isDragging, setIsDragging] = useState(false);

    function handleDrag(e: React.DragEvent) {
      e.preventDefault();
      e.stopPropagation();
    }

    function handleDragIn(e: React.DragEvent) {
      handleDrag(e);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    }

    function handleDragOut(e: React.DragEvent) {
      handleDrag(e);
      setIsDragging(false);
    }

    function handleDrop(e: React.DragEvent) {
      handleDrag(e);
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // Синтетический change поддерживает единый пайплайн обработки файла в pdf-viewer
        const syntheticEvent = {
          target: {
            files: e.dataTransfer.files,
          },
        } as React.ChangeEvent<HTMLInputElement>;

        onChange(syntheticEvent);
        e.dataTransfer.clearData();
      }
    }

    return (
      <form
        className={`file-upload__form
        ${isOpened ? ' file-upload__form_open' : ''}
        ${isDragging ? ' file-upload__form_dragging' : ''}
      `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDragIn}
        onDrop={handleDrop}>
        <label className='file-upload__label' htmlFor='file'>
          <div className='file-upload__design'>
            <CloudIcon />
            <div className='file-upload__text-wrapper'>
              <p className='file-upload__text'>
                <Trans>drag and drop your file here</Trans>
              </p>
              <p className='file-upload__text'>
                <Trans>or click</Trans>
              </p>
              <p className='file-upload__text'>
                <Trans>to select a file!</Trans>
              </p>
            </div>
          </div>
          <input id='file' ref={ref} type='file' onChange={onChange} />
        </label>
      </form>
    );
  }
);

FileUpload.displayName = 'FileUpload';

export default FileUpload;
