import { useLingui } from '@lingui/react/macro';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import React, { useState, useEffect, useRef } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { useSelector } from 'react-redux';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './index.scss';
import { useResizeDetector } from 'react-resize-detector';
import CloseIcon from '../../../shared/assets/icons/close-icon';
import GlobeIcon from '../../../shared/assets/icons/globe-icon';
import GlobeUkIcon from '../../../shared/assets/icons/globe-uk-icon';
import SyncIconM from '../../../shared/assets/icons/sync-icon-m';
import { useTranslateStatus } from '../../../shared/lib/hooks/use-translate-status';
import { isElementOpen } from '../../../shared/model/element-state-slice';
import DecorativeTextAndIconButton from '../../../shared/ui/decorative-text-and-icon-button';
import FileUpload from '../../../shared/ui/file-upload';
import IconButton from '../../../shared/ui/icon-button';
import Loader from '../../../shared/ui/loader';
import { useTranslate } from './../../../shared/lib/hooks/use-translate';
import CustomErrorMessage from './custom-error-message';
import CustomLoading from './custom-loading';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
};

const maxWidth = 2560;

function PdfTranslator({ isOpened }: { isOpened: boolean }) {
  const [file, setFile] = useState<File>();
  const [numPages, setNumPages] = useState<number>();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useLingui();

  const { progressItems, output } = useTranslateStatus();

  const { translateLanguage, toggleTranslateLanguage, translate } =
    useTranslate();

  const isOpenPdfTranslationSection = useSelector((state) =>
    isElementOpen(state, 'pdfTranslationSection')
  );

  const { width: documentWidth, ref: documentRef } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 100,
  });

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { files } = event.target;

    const nextFile = files?.[0];

    if (nextFile) {
      setFile(nextFile);
    }
  }

  function onDocumentLoadSuccess({
    numPages: nextNumPages,
  }: PDFDocumentProxy): void {
    setNumPages(nextNumPages);
  }

  const handleReset = () => {
    setFile(undefined);
    setNumPages(undefined);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const handleMouseUp = async () => {
      const selection = window.getSelection();
      const text = selection && selection.toString().trim();

      if (text && isOpenPdfTranslationSection) {
        translate(text);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpenPdfTranslationSection]);

  return (
    <section
      className={`pdf-translator${isOpened ? ' pdf-translator_open' : ''}`}>
      <div
        className={`pdf-translator__top-bar${file ? ' pdf-translator__top-bar_show' : ''}`}>
        <div className='pdf-translator__btns-container'>
          <div className='pdf-translator__btns-group'>
            {'en-ru' === translateLanguage ? (
              <DecorativeTextAndIconButton text={t`english`}>
                <GlobeIcon />
              </DecorativeTextAndIconButton>
            ) : (
              <DecorativeTextAndIconButton text={t`russian`}>
                <GlobeUkIcon />
              </DecorativeTextAndIconButton>
            )}
            {progressItems.file !== '' ? (
              <Loader />
            ) : (
              <IconButton onClick={toggleTranslateLanguage}>
                <SyncIconM color='var(--main)' />
              </IconButton>
            )}
            {'ru-en' === translateLanguage ? (
              <DecorativeTextAndIconButton text={t`english`}>
                <GlobeIcon />
              </DecorativeTextAndIconButton>
            ) : (
              <DecorativeTextAndIconButton text={t`russian`}>
                <GlobeUkIcon />
              </DecorativeTextAndIconButton>
            )}
          </div>
          <IconButton
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
            onClick={handleReset}>
            <CloseIcon />
          </IconButton>
        </div>
        <p className='pdf-translator__output'>{output}</p>
      </div>

      <div className='pdf-translator__container'>
        <div className='pdf-translator__gradient' />
        <FileUpload
          isOpened={!file}
          onChange={onFileChange}
          ref={fileInputRef}
        />
        <div
          className={`pdf-translator__document${file ? ' pdf-translator__document_show' : ''}`}
          ref={documentRef}>
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            options={options}
            error={<CustomErrorMessage />}
            loading={<CustomLoading />}>
            {Array.from(new Array(numPages), (_el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={
                  documentWidth ? Math.min(documentWidth, maxWidth) : maxWidth
                }
              />
            ))}
          </Document>
        </div>
      </div>
    </section>
  );
}

export default PdfTranslator;
