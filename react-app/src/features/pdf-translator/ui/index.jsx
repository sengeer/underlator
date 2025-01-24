import { useResizeObserver } from '@wojtekmaj/react-hooks';
import { useCallback, useState, useRef } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import SideNavigate from 'widgets/side-navigate';
import './index.scss';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
};

const resizeObserverOptions = {};

const maxWidth = 800;

export default function PdfTranslator({ isOpened }) {
  const [file, setFile] = useState('../assets/Lecture01.pdf');
  const [numPages, setNumPages] = useState();
  const [containerRef, setContainerRef] = useState(null);
  const [containerWidth, setContainerWidth] = useState();

  const translateRef = useRef(null);

  const onResize = useCallback((entries) => {
    const [entry] = entries;

    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useResizeObserver(containerRef, resizeObserverOptions, onResize);

  function onFileChange(event) {
    const { files } = event.target;

    const nextFile = files?.[0];

    if (nextFile) {
      setFile(nextFile);
    }
  }

  function onDocumentLoadSuccess({ numPages: nextNumPages }) {
    setNumPages(nextNumPages);
  }

  return (
    <section
      className={`pdf-translator${isOpened ? ' pdf-translator_open' : ''}`}>
      <header>
        <h1>react-pdf sample page</h1>
      </header>
      <div className='Example__container'>
        <div className='Example__container__load'>
          <label htmlFor='file'>Load from file:</label>{' '}
          <input onChange={onFileChange} type='file' />
        </div>
        <div className='Example__container__document' ref={setContainerRef}>
          <div ref={translateRef}>
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              options={options}>
              {Array.from(new Array(numPages), (_el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={
                    containerWidth
                      ? Math.min(containerWidth, maxWidth)
                      : maxWidth
                  }
                />
              ))}
            </Document>
          </div>
        </div>
      </div>
    </section>
  );
}
