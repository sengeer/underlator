import { Trans } from '@lingui/react/macro';
import { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import processThinkTags from '../../lib/utils/process-think-tags';
import splittingContentOfModel from '../../lib/utils/splitting-content-of-model';
import './styles/markdown-renderer.scss';
import { MarkdownRendererProps } from './types/markdown-renderer';

function MarkdownRenderer({
  content,
  className,
  showThinking = true,
}: MarkdownRendererProps) {
  if (!content) return null;

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
    <div className={`markdown-renderer ${className || ''}`}>
      {showThinking && thinkingParts.length > 0 && (
        <div className='markdown-thinking-section'>
          <div className='markdown-think__header'>
            <Trans>🤔 thinking:</Trans>
          </div>
          <div className='markdown-think__content'>
            {thinkingParts.map((thinking, index) => (
              <div key={index} className='markdown-think__paragraph'>
                {thinking}
              </div>
            ))}
          </div>
        </div>
      )}

      {finalContent && (
        <div className='markdown-main-content'>
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({ children }) => <h1 className='markdown-h1'>{children}</h1>,
              h2: ({ children }) => <h2 className='markdown-h2'>{children}</h2>,
              h3: ({ children }) => <h3 className='markdown-h3'>{children}</h3>,
              p: ({ children }) => (
                <p className='markdown-paragraph'>{children}</p>
              ),
              code: ({ children, className }) => (
                <code className={`markdown-code ${className || ''}`}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className='markdown-pre'>{children}</pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className='markdown-blockquote'>
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className='markdown-list'>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className='markdown-list markdown-list__ordered'>
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className='markdown-list-item'>{children}</li>
              ),
              hr: ({ children }) => (
                <hr className='markdown-thematic-break'>{children}</hr>
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
