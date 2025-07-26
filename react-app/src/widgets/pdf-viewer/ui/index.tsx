import { useLingui } from '@lingui/react/macro';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import React, { useState, useEffect, useRef } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { useDispatch, useSelector } from 'react-redux';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useResizeDetector } from 'react-resize-detector';
import BackspaceIcon from '../../../shared/assets/icons/backspace-icon';
import CheckIcon from '../../../shared/assets/icons/check-icon';
import CloseIcon from '../../../shared/assets/icons/close-icon';
import CopyIcon from '../../../shared/assets/icons/copy-icon';
import GlobeIcon from '../../../shared/assets/icons/globe-icon';
import GlobeUkIcon from '../../../shared/assets/icons/globe-uk-icon';
import SyncIcon from '../../../shared/assets/icons/sync-icon';
import TranslateIcon from '../../../shared/assets/icons/translate-icon';
import WithAdaptiveSize from '../../../shared/lib/hocs/with-adaptive-size';
import { useCopying } from '../../../shared/lib/hooks/use-copying';
import { useModel } from '../../../shared/lib/hooks/use-model';
import {
  selectActiveProviderSettings,
  setPrompt,
  setTypeUse,
} from '../../../shared/models/provider-settings-slice';
import AnimatingWrapper from '../../../shared/ui/animating-wrapper';
import DecorativeTextAndIconButton from '../../../shared/ui/decorative-text-and-icon-button';
import FileUpload from '../../../shared/ui/file-upload';
import IconButton from '../../../shared/ui/icon-button';
import Loader from '../../../shared/ui/loader';
import Switch from '../../../shared/ui/switch';
import CustomErrorMessage from './custom-error-message';
import CustomLoading from './custom-loading';
import './index.scss';

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

type TextInfo = {
  node: Text;
  original: string;
  element: HTMLElement;
};

type TranslateButtonPosition = {
  x: number;
  y: number;
};

function PdfViewer({ isOpened }: PdfTranslator) {
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
  const [instruction, setInstruction] = useState<string>('');

  const { provider, settings } = useSelector(selectActiveProviderSettings);
  const dispatch = useDispatch();

  const { isCopied, handleCopy } = useCopying();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useLingui();

  const {
    status: blockStatus,
    progressItems,
    generatedResponse,
    error: translationErrors,
    generate,
    translateLanguage,
    toggleTranslateLanguage,
    reset: resetTranslator,
  } = useModel();

  const { width: documentWidth, ref: documentRef } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 100,
  });

  function handleClear() {
    setInstruction('');
  }

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

  function handleReset() {
    setFile(undefined);
    setNumPages(undefined);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  interface CollectTextNodes {
    node: Text;
    original: string;
    element: HTMLElement;
  }

  function collectTextNodes(rootNode: Node, range: Range): CollectTextNodes[] {
    const visibleTextInfos: TextInfo[] = [];
    const treeWalker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node: Node) {
          if (!range.intersectsNode(node)) {
            return NodeFilter.FILTER_REJECT;
          }

          if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;

          const parentElement = node.parentElement as HTMLElement | null;
          if (!parentElement) return NodeFilter.FILTER_REJECT;

          const computedStyle = getComputedStyle(parentElement);
          if (
            computedStyle.display === 'none' ||
            computedStyle.visibility === 'hidden'
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    while (treeWalker.nextNode()) {
      const textNode = treeWalker.currentNode as Text;
      visibleTextInfos.push({
        node: textNode,
        original: textNode.nodeValue!,
        element: textNode.parentElement as HTMLElement,
      });
    }

    return visibleTextInfos;
  }

  function findClosestElement(startNode: Node): HTMLElement | null {
    let currentNode: Node | null = startNode;

    while (currentNode && currentNode !== document.body) {
      if (
        currentNode.nodeType === Node.ELEMENT_NODE &&
        [
          'block',
          'flex',
          'grid',
          'list-item',
          'table',
          'table-row',
          'table-cell',
        ].includes(getComputedStyle(currentNode as Element).display)
      ) {
        return currentNode as HTMLElement;
      }
      currentNode = currentNode.parentNode;
    }

    return null;
  }

  async function onTranslateClick() {
    setIsTranslateButtonVisible(false);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    const block = findClosestElement(range.commonAncestorContainer);
    if (!block) return;

    const collectedTextInfos = collectTextNodes(block, range);
    if (collectedTextInfos.length === 0) {
      return;
    }

    const payload = collectedTextInfos.map((t) => t.original);

    if (settings.typeUse === 'instruction') {
      generate(payload, instruction);
    } else {
      collectedTextInfos.forEach(({ element }) => {
        element.style.backgroundColor = 'var(--background)';
        element.style.color = 'var(--foreground)';
      });
      setTextInfos(collectedTextInfos);
      generate(payload);
    }

    setIsTranslateButtonVisible(false);
  }

  // Processing block translation results.
  useEffect(() => {
    if (generatedResponse === '') return;

    if (settings.typeUse !== 'instruction') {
      textInfos.forEach((info) => {
        info.node.nodeValue = '';
      });

      if (textInfos.length > 0) {
        textInfos[0].node.nodeValue = generatedResponse;
      }
    }

    if (blockStatus === 'success' || blockStatus === 'error') {
      if (blockStatus === 'error' && translationErrors) {
        const span = document.createElement('span');
        span.style.color = 'red';
        span.textContent = `Ошибка перевода: ${translationErrors}`;
      }

      if (settings.typeUse !== 'instruction') {
        setTextInfos([]);
      }
      resetTranslator();
    }
  }, [
    generatedResponse,
    blockStatus,
    translationErrors,
    resetTranslator,
    textInfos,
    settings.typeUse,
  ]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
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
  }, []);

  return (
    <section
      className={`pdf-translator${isOpened ? ' pdf-translator_open' : ''}`}>
      <div
        className={`pdf-translator__top-bar${file ? ' pdf-translator__top-bar_show' : ''}`}>
        <div className='pdf-translator__btns-container'>
          {provider === 'Ollama' && (
            <div className='pdf-translator__switch-wrapper'>
              <DecorativeTextAndIconButton text={t`translation`} />
              <Switch
                checked={settings.typeUse === 'instruction'}
                onChange={() =>
                  dispatch(
                    setTypeUse({
                      provider,
                      typeUse:
                        settings.typeUse === 'instruction'
                          ? 'translation'
                          : 'instruction',
                    })
                  )
                }
              />
              <DecorativeTextAndIconButton text={t`instruction`} />
            </div>
          )}
          <div className='pdf-translator__btns-group'>
            {settings.typeUse === 'translation' && (
              <>
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
              </>
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
        {provider === 'Ollama' && settings.typeUse === 'instruction' && (
          <>
            <div className='pdf-translator__text-wrapper'>
              <textarea
                className='pdf-translator__textarea'
                value={instruction}
                rows={1}
                onChange={(e) => {
                  setInstruction(e.target.value);
                  dispatch(setPrompt({ provider, prompt: e.target.value }));
                }}
              />
              <IconButton
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
                onClick={handleClear}
                isDisabled={instruction === ''}>
                <BackspaceIcon />
              </IconButton>
            </div>
            <div className='pdf-translator__text-wrapper'>
              <p className='pdf-translator__output'>{generatedResponse}</p>
              {generatedResponse && (
                <IconButton
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                  }}
                  onClick={() => handleCopy(generatedResponse)}
                  isDisabled={generatedResponse === '' || isCopied}>
                  <AnimatingWrapper isShow={isCopied}>
                    <CheckIcon />
                  </AnimatingWrapper>
                  <AnimatingWrapper isShow={!isCopied}>
                    <CopyIcon />
                  </AnimatingWrapper>
                </IconButton>
              )}
            </div>
          </>
        )}
      </div>

      <div className='pdf-translator__container'>
        {isTranslateButtonVisible && (
          <IconButton
            isActiveStyle
            style={{
              position: 'absolute',
              top: `${positionOfTranslateButton.y}px`,
              left: `${positionOfTranslateButton.x}px`,
              cursor: 'pointer',
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
            }}
            onClick={() => onTranslateClick()}>
            <WithAdaptiveSize WrappedComponent={TranslateIcon} />
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

export default PdfViewer;
