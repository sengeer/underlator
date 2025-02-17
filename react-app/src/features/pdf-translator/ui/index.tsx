import type { PDFDocumentProxy } from 'pdfjs-dist';
import React, { useState, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './index.scss';
import { useResizeDetector } from 'react-resize-detector';
import GlobeIcon from '../../../shared/assets/icons/globe-icon';
import GlobeUkIcon from '../../../shared/assets/icons/globe-uk-icon';
import SyncIconM from '../../../shared/assets/icons/sync-icon-m';
import { useTranslateStatus } from '../../../shared/lib/hooks/use-translate-status';
import FileUpload from '../../../shared/ui/file-upload';
import IconButton from '../../../shared/ui/icon-button';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import { useTranslate } from './../../../shared/lib/hooks/use-translate';
import Loader from './../../../shared/ui/loader';

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

  const { progressItems, output } = useTranslateStatus();

  const { translateLanguage, toggleTranslateLanguage, translate } =
    useTranslate();

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

  useEffect(() => {
    const handleMouseUp = async () => {
      const selection = window.getSelection();
      const text = selection && selection.toString().trim();

      if (text) {
        translate(text);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <section
      className={`pdf-translator${isOpened ? ' pdf-translator_open' : ''}`}>
      <div
        className={`pdf-translator__top-bar${file ? ' pdf-translator__top-bar_show' : ''}`}>
        <div className='pdf-translator__btns-group'>
          {'en-ru' === translateLanguage ? (
            <TextAndIconButton text='english' isDisabled>
              <GlobeIcon color='var(--main)' />
            </TextAndIconButton>
          ) : (
            <TextAndIconButton text='русский' isDisabled>
              <GlobeUkIcon color='var(--main)' />
            </TextAndIconButton>
          )}
          {progressItems.file !== '' ? (
            <Loader />
          ) : (
            <IconButton onClick={toggleTranslateLanguage}>
              <SyncIconM color='var(--main)' />
            </IconButton>
          )}
          {'ru-en' === translateLanguage ? (
            <TextAndIconButton text='english' isDisabled>
              <GlobeIcon color='var(--main)' />
            </TextAndIconButton>
          ) : (
            <TextAndIconButton text='русский' isDisabled>
              <GlobeUkIcon color='var(--main)' />
            </TextAndIconButton>
          )}
        </div>
        <p className='pdf-translator__output'>{output}</p>
      </div>

      <div className='pdf-translator__container'>
        <div className='pdf-translator__gradient' />
        <FileUpload isOpened={!file} onChange={onFileChange} />
        <div
          className={`pdf-translator__document${file ? ' pdf-translator__document_show' : ''}`}
          ref={documentRef}>
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            options={options}>
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
