import { useResizeObserver } from '@wojtekmaj/react-hooks';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import React, { useCallback, useState, useRef } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './index.scss';
import { useResizeDetector } from 'react-resize-detector';
import FileUpload from 'shared/ui/file-upload';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
};

const resizeObserverOptions = {};

export default function PdfTranslator({ isOpened }: { isOpened: boolean }) {
  const [file, setFile] = useState<File>();
  const [numPages, setNumPages] = useState<number>();
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();

  const translateRef = useRef(null);

  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries;

    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useResizeObserver(containerRef, resizeObserverOptions, onResize);

  const { width: pdfTranslatorWidth, ref: pdfTranslatorRef } =
    useResizeDetector({
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

  return (
    <section
      className={`pdf-translator${isOpened ? ' pdf-translator_open' : ''}`}>
      <div className='pdf-translator__container' ref={pdfTranslatorRef}>
        <FileUpload isOpened={!file} onChange={onFileChange} />
        <div
          className={`pdf-translator__document${file ? ' pdf-translator__document_show' : ''}`}
          ref={setContainerRef}>
          <div ref={translateRef}>
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              options={options}>
              {Array.from(new Array(numPages), (_el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={containerWidth}
                />
              ))}
            </Document>
          </div>
        </div>
      </div>
    </section>
  );
}
