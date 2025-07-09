import { useLingui } from '@lingui/react/macro';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import React, { useState, useEffect, useRef } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { useSelector } from 'react-redux';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './index.scss';
import { useResizeDetector } from 'react-resize-detector';
import CheckIcon from '../../../shared/assets/icons/check-icon';
import CloseIcon from '../../../shared/assets/icons/close-icon';
import CopyIcon from '../../../shared/assets/icons/copy-icon';
import GlobeIcon from '../../../shared/assets/icons/globe-icon';
import GlobeUkIcon from '../../../shared/assets/icons/globe-uk-icon';
import SyncIcon from '../../../shared/assets/icons/sync-icon';
import { useCopying } from '../../../shared/lib/hooks/use-copying';
import { useTranslate } from '../../../shared/lib/hooks/use-translate';
import { useTranslateStatus } from '../../../shared/lib/hooks/use-translate-status';
import { isElementOpen } from '../../../shared/model/element-state-slice';
import AnimatingWrapper from '../../../shared/ui/animating-wrapper';
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

let uiBtn: HTMLImageElement | null = null; // плавающая иконка
let activeBlock: HTMLElement | null = null; // выбранный блочный DOM-элемент
let textInfos: {
  node: Text;
  original: string;
}[] = [];

function PdfTranslator({ isOpened }: PdfTranslator) {
  const [file, setFile] = useState<File>();
  const [numPages, setNumPages] = useState<number>();

  const { isCopied, handleCopy } = useCopying();

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

  function removeBtn() {
    uiBtn?.remove();
    uiBtn = null;
  }
  function showBtn(x: number, y: number) {
    removeBtn();
    uiBtn = document.createElement('img');
    Object.assign(uiBtn.style, {
      position: 'absolute',
      top: `${y}px`,
      left: `${x}px`,
      width: '24px',
      height: '24px',
      cursor: 'pointer',
      zIndex: '2147483647',
    } as CSSStyleDeclaration);
    document.body.appendChild(uiBtn);
    uiBtn.addEventListener('click', onTranslateClick);
  }

  async function onTranslateClick() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    // 4.1 Блок
    const block = findClosestBlockElement(range.commonAncestorContainer);
    if (!block) return;
    activeBlock = block;
    block.style.backgroundColor = 'yellow';

    // 4.2 Сбор текстовых узлов
    textInfos = collectVisibleTextNodes(block);
    if (textInfos.length === 0) {
      block.style.backgroundColor = '';
      return;
    }
    const payload = textInfos.map((t) => t.original);

    console.log(payload);

    removeBtn();
  }

  useEffect(() => {
    const handleMouseUp = async (e: Event) => {
      if (uiBtn && e.target === uiBtn) return;
      setTimeout(() => {
        const sel = window.getSelection();
        const txt = sel?.toString().trim();
        if (!txt || !sel) {
          removeBtn();
          return;
        }
        const ae = document.activeElement;
        if (ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) {
          removeBtn();
          return;
        }
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        showBtn(
          rect.right + window.scrollX - 12,
          rect.top + window.scrollY - 28
        );
      }, 10);
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
        <div className='pdf-translator__output-wrapper'>
          <p className='pdf-translator__output'>{output}</p>
          {output && (
            <IconButton
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
              }}
              onClick={() => handleCopy(output)}
              isDisabled={output === '' || isCopied}>
              <AnimatingWrapper isShow={isCopied}>
                <CheckIcon />
              </AnimatingWrapper>
              <AnimatingWrapper isShow={!isCopied}>
                <CopyIcon />
              </AnimatingWrapper>
            </IconButton>
          )}
        </div>
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
