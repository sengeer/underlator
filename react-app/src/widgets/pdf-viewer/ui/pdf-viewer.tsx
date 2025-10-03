/**
 * @module PdfViewer
 * Виджет для просмотра и перевода PDF документов.
 * Предоставляет функциональность загрузки PDF файлов, выделения текста,
 * контекстного перевода и интерактивного взаимодействия с моделью.
 */

import { useLingui } from '@lingui/react/macro';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useState, useEffect, useRef } from 'react';
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
import StopCircleIcon from '../../../shared/assets/icons/stop-circle-icon';
import SyncIcon from '../../../shared/assets/icons/sync-icon';
import TranslateIcon from '../../../shared/assets/icons/translate-icon';
import UnderlatorIcon from '../../../shared/assets/icons/underlator-icon';
import useCopying from '../../../shared/lib/hooks/use-copying';
import useFormAndValidation from '../../../shared/lib/hooks/use-form-and-validation';
import useModel from '../../../shared/lib/hooks/use-model';
import useTranslateButton from '../../../shared/lib/hooks/use-translate-button';
import stringifyGenerateResponse from '../../../shared/lib/utils/stringify-generate-response';
import { createUpdateHandler } from '../../../shared/lib/utils/text-node-manager/text-node-manager';
import {
  selectActiveProviderSettings,
  setTypeUse,
} from '../../../shared/models/provider-settings-slice';
import AnimatingWrapper from '../../../shared/ui/animating-wrapper';
import DecorativeTextAndIconButton from '../../../shared/ui/decorative-text-and-icon-button';
import FileUpload from '../../../shared/ui/file-upload';
import IconButton from '../../../shared/ui/icon-button';
import Loader from '../../../shared/ui/loader';
import MarkdownRenderer from '../../../shared/ui/markdown-renderer';
import Switch from '../../../shared/ui/switch';
import CustomErrorMessage from './custom-error-message';
import CustomLoading from './custom-loading';
import '../styles/pdf-viewer.scss';

// Конфигурация PDF.js worker для обработки PDF документов
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Опции для рендеринга PDF документов.
 * Настройки для корректного отображения шрифтов и символов.
 */
const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
};

/**
 * Максимальная ширина PDF документа в пикселях.
 * Ограничивает размер документа для оптимальной производительности.
 */
const maxWidth = 2560;

/**
 * Интерфейс пропсов компонента PdfViewer.
 * Определяет параметры для управления видимостью виджета.
 */
export interface PdfTranslator {
  /** Флаг видимости виджета PDF просмотрщика */
  isOpened: boolean;
}

/**
 * Компонент PdfViewer.
 *
 * Основной виджет для работы с PDF документами, включающий:
 * - Загрузку и отображение PDF файлов
 * - Выделение текста для перевода
 * - Контекстный перевод через LLM модели
 * - Интерактивные инструкции для анализа документов
 * - Управление состоянием перевода и отображения результатов
 *
 * Использует react-pdf для рендеринга, Redux для управления состоянием,
 * и интегрируется с системой переводов через useModel хук.
 *
 * @param props - Пропсы компонента
 * @param props.isOpened - Флаг видимости виджета
 * @returns JSX элемент PDF просмотрщика
 *
 * @example
 * // Базовое использование в Main компоненте
 * <PdfViewer isOpened={isOpenPdfTranslationSection} />
 */
function PdfViewer({ isOpened }: PdfTranslator) {
  // Состояние загруженного PDF файла
  const [file, setFile] = useState<File>();
  // Массив текстовых узлов для перевода
  const [textInfos, setTextInfos] = useState<TextInfo[]>([]);
  // Количество страниц в PDF документе
  const [numPages, setNumPages] = useState<number>();

  // Настройки активного провайдера из Redux store
  const { provider, settings } = useSelector(selectActiveProviderSettings);
  const dispatch = useDispatch();

  // Хук для работы с копированием текста
  const { isCopied, handleCopy } = useCopying();

  // Ссылка на input элемент для загрузки файлов
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Хук для интернационализации
  const { t } = useLingui();

  // Хук для работы с LLM моделями
  const {
    status,
    generatedResponse,
    error: translationErrors,
    generate,
    translateLanguage,
    toggleTranslateLanguage,
    reset: resetResponse,
    stop,
  } = useModel();

  // Ссылка на верхнюю панель для позиционирования кнопки перевода
  const topBarRef = useRef(null);

  // Хук для управления кнопкой перевода
  const {
    buttonState,
    handleTranslateClick,
    handleStopClick,
    hideButton,
    isVisible: isTranslateButtonVisible,
    position: positionOfTranslateButton,
  } = useTranslateButton({
    onTranslate: onTranslateClick,
    onStop: stop,
    isProcessing: status === 'process',
    containerRef: topBarRef,
  });

  // Хук для работы с формами и валидацией
  const { values, handleChange, resetForm, setValues } = useFormAndValidation();

  // Хук для отслеживания размеров документа
  const { width: documentWidth, ref: documentRef } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 100,
  });

  /**
   * Обработчик изменения файла.
   * Устанавливает выбранный PDF файл в состояние компонента.
   *
   * @param event - Событие изменения input элемента.
   */
  function onFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { files } = event.target;

    const nextFile = files?.[0];

    if (nextFile) {
      setFile(nextFile);
    }
  }

  /**
   * Обработчик успешной загрузки PDF документа.
   * Устанавливает количество страниц документа.
   *
   * @param param0 - Объект с информацией о загруженном документе.
   * @param param0.numPages - Количество страниц в документе.
   */
  function onDocumentLoadSuccess({
    numPages: nextNumPages,
  }: PDFDocumentProxy): void {
    setNumPages(nextNumPages);
  }

  /**
   * Сбрасывает состояние компонента.
   * Очищает загруженный файл, количество страниц и input элемент.
   */
  function handleReset() {
    setFile(undefined);
    setNumPages(undefined);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  /**
   * Интерфейс для сбора текстовых узлов.
   * Определяет структуру данных для работы с DOM узлами при переводе.
   */
  interface CollectTextNodes {
    /** DOM текстовый узел */
    node: Text;
    /** Оригинальный текст узла */
    original: string;
    /** Родительский HTML элемент */
    element: HTMLElement;
  }

  /**
   * Собирает видимые текстовые узлы в указанном диапазоне.
   * Использует TreeWalker для эффективного обхода DOM дерева
   * и фильтрации только видимых текстовых узлов.
   *
   * @param rootNode - Корневой узел для поиска.
   * @param range - Диапазон выделения для проверки пересечения.
   * @returns Массив найденных текстовых узлов с их метаданными.
   */
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

  /**
   * Находит ближайший блочный элемент от указанного узла.
   * Поднимается по DOM дереву до первого элемента с блочным типом отображения.
   * Используется для определения контейнера для позиционирования кнопки перевода.
   *
   * @param startNode - Начальный узел для поиска.
   * @returns Ближайший блочный HTML элемент или null.
   */
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

  /**
   * Обработчик клика по кнопке перевода.
   * Собирает выделенный текст, определяет режим работы (перевод/инструкция)
   * и запускает соответствующий процесс генерации через LLM модель.
   *
   * Для режима перевода использует контекстный перевод с массивом текстовых фрагментов.
   * Для режима инструкций обрабатывает текст как единую строку с пользовательской инструкцией.
   */
  async function onTranslateClick() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    // TODO: Добавить допустимость отображения кнопки перевода только внутри определенного HTML-элемента
    const block = findClosestElement(range.commonAncestorContainer);
    if (!block) return;

    const collectedTextInfos = collectTextNodes(block, range);
    if (collectedTextInfos.length === 0) {
      return;
    }

    const payloadArray = collectedTextInfos.map((t) => t.original);

    const payloadString = collectedTextInfos
      .map((item) => item.original)
      .join(' ');

    if (settings.typeUse === 'instruction') {
      generate(
        payloadString,
        {
          responseMode: 'stringStream',
          instruction:
            values.instruction === ''
              ? t`what does this mean?`
              : values.instruction,
        },
        {
          think: true,
        }
      );
    } else {
      collectedTextInfos.forEach(({ element }) => {
        element.style.backgroundColor = 'var(--background)';
        element.style.color = 'var(--foreground)';
      });

      setTextInfos(collectedTextInfos);
      generate(
        payloadArray,
        {
          responseMode: 'arrayStream',
          useContextualTranslation: true,
        },
        {
          think: false,
        }
      );
    }
  }

  /**
   * Эффект для обработки результатов перевода.
   * Обновляет DOM узлы с переведенным текстом и управляет состоянием компонента.
   * Использует функциональную утилиту createUpdateHandler для безопасного обновления текстовых узлов.
   */
  useEffect(() => {
    if (settings.typeUse === 'translation') {
      if (Object.keys(generatedResponse).length === 0) return;

      // Функциональная утилита для обновления текстовых узлов
      const shouldLogErrors =
        (status === 'success' || status === 'error') && textInfos.length > 0;
      const updateHandler = createUpdateHandler(textInfos, shouldLogErrors);

      updateHandler(generatedResponse as Record<number, string>);

      if (status === 'success' || status === 'error') {
        if (status === 'error' && translationErrors) {
          const span = document.createElement('span');
          span.style.color = 'red';
          span.textContent = `Ошибка перевода: ${translationErrors}`;
        }

        if (settings.typeUse === 'translation') {
          setTextInfos([]);
          resetResponse();
        }
      }
    }

    hideButton();
  }, [
    provider,
    generatedResponse,
    status,
    translationErrors,
    settings.typeUse,
    textInfos,
    hideButton,
  ]);

  /**
   * Эффект для инициализации формы инструкций.
   * Сбрасывает форму и устанавливает пустое значение для поля инструкции.
   */
  useEffect(() => {
    resetForm();
    setValues({
      instruction: '',
    });
  }, [resetForm, setValues]);

  return (
    <section className={`pdf-viewer${isOpened ? ' pdf-viewer_open' : ''}`}>
      <div
        ref={topBarRef}
        className={`pdf-viewer__top-bar${file ? ' pdf-viewer__top-bar_show' : ''}`}>
        <div className='pdf-viewer__btns-container'>
          <div className='pdf-viewer__switch-wrapper'>
            <DecorativeTextAndIconButton
              text={t`translation`}
              decorativeColor='var(--foreground)'
            />
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
            <DecorativeTextAndIconButton
              text={t`instruction`}
              decorativeColor='var(--foreground)'
            />
          </div>
          <div className='pdf-viewer__translate-btns'>
            {settings.typeUse === 'translation' && (
              <>
                {'en-ru' === translateLanguage ? (
                  <DecorativeTextAndIconButton
                    text={t`english`}
                    decorativeColor='var(--foreground)'>
                    <GlobeIcon />
                  </DecorativeTextAndIconButton>
                ) : (
                  <DecorativeTextAndIconButton
                    text={t`russian`}
                    decorativeColor='var(--foreground)'>
                    <GlobeUkIcon />
                  </DecorativeTextAndIconButton>
                )}
                <IconButton onClick={toggleTranslateLanguage}>
                  <SyncIcon color='var(--main)' />
                </IconButton>
                {'ru-en' === translateLanguage ? (
                  <DecorativeTextAndIconButton
                    text={t`english`}
                    decorativeColor='var(--foreground)'>
                    <GlobeIcon />
                  </DecorativeTextAndIconButton>
                ) : (
                  <DecorativeTextAndIconButton
                    text={t`russian`}
                    decorativeColor='var(--foreground)'>
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
        {settings.typeUse === 'instruction' && (
          <>
            <div className='pdf-viewer__text-wrapper'>
              <input
                className='pdf-viewer__instruction'
                type='text'
                id='instruction'
                placeholder={t`what does this mean?`}
                name='instruction'
                value={values.instruction || ''}
                onChange={(e) => handleChange(e)}
              />
            </div>
            {(generatedResponse || status === 'process') && (
              <div className='pdf-viewer__output-wrapper'>
                {generatedResponse ? (
                  <MarkdownRenderer
                    content={stringifyGenerateResponse(generatedResponse)}
                    className='pdf-viewer__output'
                    showThinking
                  />
                ) : (
                  <Loader />
                )}
                {status === 'process' ? (
                  <IconButton
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: 0,
                    }}
                    onClick={stop}>
                    <StopCircleIcon />
                  </IconButton>
                ) : (
                  <IconButton
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: 0,
                    }}
                    onClick={resetResponse}>
                    <BackspaceIcon />
                  </IconButton>
                )}
                <IconButton
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '24px',
                  }}
                  onClick={() =>
                    handleCopy(stringifyGenerateResponse(generatedResponse))
                  }>
                  <AnimatingWrapper isShow={isCopied}>
                    <CheckIcon />
                  </AnimatingWrapper>
                  <AnimatingWrapper isShow={!isCopied}>
                    <CopyIcon />
                  </AnimatingWrapper>
                </IconButton>
              </div>
            )}
          </>
        )}
      </div>

      <div className='pdf-viewer__container'>
        {isTranslateButtonVisible && positionOfTranslateButton && (
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
            onClick={
              buttonState.type === 'stop'
                ? handleStopClick
                : handleTranslateClick
            }>
            {buttonState.type === 'stop' &&
            settings.typeUse !== 'instruction' ? (
              <StopCircleIcon />
            ) : settings.typeUse === 'instruction' ? (
              <UnderlatorIcon />
            ) : (
              <TranslateIcon width={32} height={32} />
            )}
          </IconButton>
        )}
        <div className='pdf-viewer__gradient' />
        <FileUpload
          isOpened={!file}
          onChange={onFileChange}
          ref={fileInputRef}
        />
        <div
          className={`pdf-viewer__document${file ? ' pdf-viewer__document_show' : ''}`}
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
