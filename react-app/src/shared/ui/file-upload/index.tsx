import { Trans } from '@lingui/react/macro';
import { forwardRef } from 'react';
import { useState } from 'react';
import './index.scss';
import CloudIcon from '../../assets/icons/cloud-icon';

interface FileUpload {
  isOpened: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUpload = forwardRef<HTMLInputElement, FileUpload>(
  ({ isOpened, onChange }, ref) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragIn = (e: React.DragEvent) => {
      handleDrag(e);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragOut = (e: React.DragEvent) => {
      handleDrag(e);
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      handleDrag(e);
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const syntheticEvent = {
          target: {
            files: e.dataTransfer.files,
          },
        } as React.ChangeEvent<HTMLInputElement>;

        onChange(syntheticEvent);
        e.dataTransfer.clearData();
      }
    };

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
