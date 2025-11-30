/**
 * @module MarkdownRenderer
 * Компонент отвечает за унифицированный рендер markdown-ответов моделей
 * во всех сценариях общения с LLM (чат, переводчики, просмотр PDF).
 * Поддерживаются дополнительные теги `<think>`, математическая нотация
 * и копирование очищенного ответа без внутренних заметок модели.
 */

import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import CheckIcon from '../../assets/icons/check-icon';
import CopyIcon from '../../assets/icons/copy-icon';
import KeyboardArrowDownIcon from '../../assets/icons/keyboard-arrow-down-icon';
import useCopying from '../../lib/hooks/use-copying';
import processThinkTags from '../../lib/utils/process-think-tags';
import splittingContentOfModel from '../../lib/utils/splitting-content-of-model';
import AnimatingWrapper from '../animating-wrapper';
import DecorativeTextAndIconButton from '../decorative-text-and-icon-button';
import IconButton from '../icon-button';
import TextAndIconButton from '../text-and-icon-button';
import 'katex/dist/katex-swap.min.css';
import './styles/markdown-renderer.scss';
import './styles/thinking.scss';
import { MarkdownRendererProps } from './types/markdown-renderer';

/**
 * Компонент для рендера markdown-контента с поддержкой "мыслящих" блоков,
 * математической нотации и служебных UI-элементов (копирование, заголовок, thinking-панель).
 *
 * Используется в `TextTranslator`, `PdfViewer` и `MessageBubble`, обеспечивая единообразное отображение
 * результата LLM независимо от режима работы.
 *
 * @param content - Исходный markdown-текст или `null`, если ответа еще нет.
 * @param className - Дополнительный CSS-класс контейнера.
 * @param style - Инлайновые стили контейнера.
 * @param showThinking - Флаг отображения секции внутренних размышлений модели.
 * @param text - Дополнительная подпись (например, название модели), отображается справа в заголовке.
 * @param placeholder - Контент-заглушка до появления основного текста.
 * @returns Готовый блок с отрисованным markdown и вспомогательными элементами.
 *
 * @example
 * // Использование в чате для отображения ответа
 * <MarkdownRenderer
 *   content={message.content}
 *   showThinking
 *   text={message.modelName}
 * />
 *
 * @example
 * // Использование в переводчике с кастомным плейсхолдером
 * <MarkdownRenderer
 *   content={translatedText}
 *   placeholder={t`translation_placeholder`}
 *   showThinking={false}
 * />
 */
function MarkdownRenderer({
  content,
  className,
  style,
  showThinking = true,
  text,
  placeholder,
}: MarkdownRendererProps) {
  if (!content) return renderPlaceholder();

  const [isShowThinking, setIsShowThinking] = useState<boolean>(false);

  const { isCopied, handleCopy } = useCopying();

  const { t } = useLingui();

  const processedContent = processThinkTags(content);

  const { thinkingParts, mainContentParts } =
    splittingContentOfModel(processedContent);

  // Логика выбора основного контента исключает внутренние заметки,
  // чтобы пользователь видел только финальный ответ модели.
  let finalContent;

  if (thinkingParts.length === 0) {
    // При отсутствии тегов <think> используется исходный текст без преобразований.
    finalContent = processedContent;
  } else {
    // При наличии тегов <think> финальный текст составляется без внутренних заметок.
    finalContent = mainContentParts.join('\n\n');
  }

  const anchorRef = useRef<HTMLDivElement>(null);

  /**
   * Гарантирует автоматический скролл к последнему фрагменту markdown,
   * чтобы свежие ответы модели оставались в фокусе пользователя.
   */
  function scrollToBottom() {
    if (anchorRef.current) {
      anchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  useEffect(() => {
    scrollToBottom();
  }, [content]);

  /**
   * Рендерит заглушку до появления основного markdown-контента.
   * Используется во всех сценариях, где компонент подключен до готовности данных.
   */
  function renderPlaceholder() {
    return (
      <div className={`markdown-renderer__placeholder ${className || ''}`}>
        {placeholder}
      </div>
    );
  }

  return (
    <div style={style} className={`markdown-renderer ${className || ''}`}>
      <div className='markdown-renderer__header'>
        {showThinking && thinkingParts.length > 0 && (
          <TextAndIconButton
            text={t`thinking`}
            onClick={() => setIsShowThinking(!isShowThinking)}>
            <KeyboardArrowDownIcon
              style={{
                transform: `rotateX(${isShowThinking ? '0deg' : '180deg'})`,
              }}
            />
          </TextAndIconButton>
        )}
        {text && (
          <DecorativeTextAndIconButton
            style={{ paddingRight: '2rem' }}
            text={text}
            decorativeColor='var(--main)'
          />
        )}
        <IconButton
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
          }}
          onClick={() => handleCopy(mainContentParts.toString())}
          isDisabled={!mainContentParts || isCopied}>
          <AnimatingWrapper isShow={isCopied}>
            <CheckIcon />
          </AnimatingWrapper>
          <AnimatingWrapper isShow={!isCopied}>
            <CopyIcon />
          </AnimatingWrapper>
        </IconButton>
        <div />
      </div>
      {showThinking && thinkingParts.length > 0 && isShowThinking && (
        <div className='thinking'>
          <div className='thinking__content'>
            {thinkingParts.map((thinking, index) => (
              <div key={index} className='thinking__paragraph'>
                {thinking}
              </div>
            ))}
          </div>
        </div>
      )}

      {finalContent && (
        <div className='markdown-renderer__content'>
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={{
              h1: ({ children }) => (
                <h1 className='markdown-renderer__h1'>{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className='markdown-renderer__h2'>{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className='markdown-renderer__h3'>{children}</h3>
              ),
              p: ({ children }) => (
                <p className='markdown-renderer__paragraph'>{children}</p>
              ),
              code: ({ children, className }) => (
                <code className={`markdown-renderer__code ${className || ''}`}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className='markdown-renderer__pre'>{children}</pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className='markdown-renderer__blockquote'>
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className='markdown-renderer__list'>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className='markdown-renderer__list markdown-renderer__list_ordered'>
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className='markdown-renderer__list-item'>{children}</li>
              ),
              hr: ({ children }) => (
                <hr className='markdown-renderer__thematic-break'>
                  {children}
                </hr>
              ),
            }}>
            {finalContent}
          </Markdown>
        </div>
      )}
      <div ref={anchorRef} />
    </div>
  );
}

export default MarkdownRenderer;
