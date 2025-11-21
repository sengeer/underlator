import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
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
import './styles/markdown-renderer.scss';
import './styles/thinking.scss';
import { MarkdownRendererProps } from './types/markdown-renderer';

function MarkdownRenderer({
  content,
  className,
  style,
  showThinking = true,
  text,
}: MarkdownRendererProps) {
  if (!content) return null;

  const [isShowThinking, setIsShowThinking] = useState<boolean>(false);

  const { isCopied, handleCopy } = useCopying();

  const { t } = useLingui();

  const processedContent = processThinkTags(content);

  const { thinkingParts, mainContentParts } =
    splittingContentOfModel(processedContent);

  // Defining final content
  let finalContent;

  if (thinkingParts.length === 0) {
    // If there is not <think>...</think>, use original content
    finalContent = processedContent;
  } else {
    // If there is <think>...</think>, use only main content without think tags
    finalContent = mainContentParts.join('\n\n');
  }

  const anchorRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    if (anchorRef.current) {
      anchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  useEffect(() => {
    scrollToBottom();
  }, [content]);

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
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
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
