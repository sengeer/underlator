import { useLingui } from '@lingui/react/macro';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import React, { useState, useEffect, useRef } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './index.scss';
import { useResizeDetector } from 'react-resize-detector';
import CloseIcon from '../../../shared/assets/icons/close-icon';
import GlobeIcon from '../../../shared/assets/icons/globe-icon';
import GlobeUkIcon from '../../../shared/assets/icons/globe-uk-icon';
import SyncIcon from '../../../shared/assets/icons/sync-icon';
import TranslateIcon from '../../../shared/assets/icons/translate-icon';
import { useTextTranslator } from '../../../shared/lib/hooks/use-text-translator';
import DecorativeTextAndIconButton from '../../../shared/ui/decorative-text-and-icon-button';
import FileUpload from '../../../shared/ui/file-upload';
import IconButton from '../../../shared/ui/icon-button';
import Loader from '../../../shared/ui/loader';
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

interface PdfTranslator {
  isOpened: boolean;
}

let activeBlock: HTMLElement | null = null;

type TextInfo = {
  node: Text;
  original: string;
};

type TranslateButtonPosition = {
  x: number;
  y: number;
};

function PdfTranslator({ isOpened }: PdfTranslator) {
  const [file, setFile] = useState<File>();
  const [textInfos, setTextInfos] = useState<TextInfo[]>([]);
  const [numPages, setNumPages] = useState<number>();
  const [positionOfTranslateButton, setPositionOfTranslateButton] =
    useState<TranslateButtonPosition>({
      x: 0,
      y: 0,
    });
  const [isTranslateButtonVisible, setIsTranslateButtonVisible] =
    useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useLingui();

  const {
    status: blockStatus,
    progressItems,
    translatedChunks,
    error: translationErrors,
    translateChunks,
    translateLanguage,
    toggleTranslateLanguage,
    reset: resetTranslator,
  } = useTextTranslator();

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

  function collectVisibleTextNodes(root: Node) {
    const out: { node: Text; original: string }[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;

        const el = node.parentElement as HTMLElement | null;
        if (!el) return NodeFilter.FILTER_REJECT;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    while (walker.nextNode()) {
      const n = walker.currentNode as Text;
      out.push({ node: n, original: n.nodeValue! });
    }
    return out;
  }

  function findClosestBlockElement(node: Node) {
    let cur: Node | null = node;
    while (cur && cur !== document.body) {
      if (
        cur.nodeType === Node.ELEMENT_NODE &&
        [
          'block',
          'flex',
          'grid',
          'list-item',
          'table',
          'table-row',
          'table-cell',
        ].includes(getComputedStyle(cur as Element).display)
      ) {
        return cur as HTMLElement;
      }
      cur = cur.parentNode;
    }
    return null;
  }

  async function onTranslateClick() {
    setIsTranslateButtonVisible(false);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    const block = findClosestBlockElement(range.commonAncestorContainer);
    if (!block) return;
    activeBlock = block;

    if (block.tagName.toLowerCase() === 'span') {
      block.style.backgroundColor = 'var(--background)';
      block.style.color = 'var(--foreground)';
    }

    const spans = block.getElementsByTagName('span');
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      span.style.color = 'var(--foreground)';
      span.style.backgroundColor = 'var(--background)';
    }

    const collectedTextInfos = collectVisibleTextNodes(block);
    if (collectedTextInfos.length === 0) {
      block.style.backgroundColor = '';
      return;
    }
    setTextInfos(collectedTextInfos);
    const payload = collectedTextInfos.map((t) => t.original);
    translateChunks(payload);
    setIsTranslateButtonVisible(false);
  }

  // Processing block translation results.
  useEffect(() => {
    if (Object.keys(translatedChunks).length === 0) return;

    Object.entries(translatedChunks).forEach(([idx, text]) => {
      const index = parseInt(idx, 10);
      if (textInfos[index] && textInfos[index].node) {
        textInfos[index].node.nodeValue = text;
      } else {
        console.warn(`Node at index ${index} not found in textInfos.`);
      }
    });

    if (blockStatus === 'success' || blockStatus === 'error') {
      if (activeBlock) {
        if (blockStatus === 'error' && translationErrors) {
          const span = document.createElement('span');
          span.style.color = 'red';
          span.textContent = `Ошибка перевода: ${translationErrors}`;
          activeBlock.appendChild(span);
        }
        activeBlock = null;
      }
      setTextInfos([]);
      resetTranslator();
    }
  }, [
    translatedChunks,
    blockStatus,
    translationErrors,
    resetTranslator,
    textInfos,
  ]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (activeBlock && activeBlock.contains(e.target as Node)) {
        return;
      }

      setTimeout(() => {
        const sel = window.getSelection();
        const txt = sel?.toString().trim();
        if (!txt || !sel) {
          setIsTranslateButtonVisible(false);
          return;
        }
        const ae = document.activeElement;
        if (ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) {
          setIsTranslateButtonVisible(false);
          return;
        }
        const rect = sel.getRangeAt(0).getBoundingClientRect();

        setIsTranslateButtonVisible(true);

        setPositionOfTranslateButton({
          x: rect.right + window.scrollX - 12,
          y: rect.top + window.scrollY - 28,
        });
      }, 10);
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [activeBlock]);

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
                <SyncIcon color='var(--main)' />
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
      </div>

      <div className='pdf-translator__container'>
        {isTranslateButtonVisible && (
          <IconButton
            style={{
              position: 'absolute',
              top: `${positionOfTranslateButton.y}px`,
              left: `${positionOfTranslateButton.x}px`,
              cursor: 'pointer',
              zIndex: 3,
            }}
            onClick={() => onTranslateClick()}>
            <TranslateIcon />
          </IconButton>
        )}
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
