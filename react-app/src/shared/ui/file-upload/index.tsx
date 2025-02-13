import React from 'react';
import './index.scss';
import CloudIcon from '../../assets/icons/cloud-icon';

function FileUpload({
  isOpened,
  onChange,
}: {
  isOpened: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <form
      className={`file-upload__form ${isOpened ? ' file-upload__form_open' : ''}`}>
      <label className='file-upload__label' htmlFor='file'>
        <div className='file-upload__design'>
          <CloudIcon />
          <div className='file-upload__text-wrapper'>
            <p className='file-upload__text'>Перетащить</p>
            <p className='file-upload__text'>или</p>
            <p className='file-upload__text'>Выбрать файл</p>
          </div>
        </div>
        <input id='file' type='file' onChange={onChange} />
      </label>
    </form>
  );
}

export default FileUpload;
