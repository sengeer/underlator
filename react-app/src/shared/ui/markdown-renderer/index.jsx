import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import processThinkTags from '../../lib/utils/process-think-tags';
import './index.scss';

function MarkdownRenderer({ content, className }) {
  const processedContent = processThinkTags(content);

  return (
    <div className={`markdown-renderer ${className || ''}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ children }) => <h1 className='markdown-h1'>{children}</h1>,
          h2: ({ children }) => <h2 className='markdown-h2'>{children}</h2>,
          h3: ({ children }) => <h3 className='markdown-h3'>{children}</h3>,
          p: ({ children }) => <p className='markdown-paragraph'>{children}</p>,
          code: ({ children, className }) => (
            <code className={`markdown-code ${className || ''}`}>
              {children}
            </code>
          ),
          pre: ({ children }) => <pre className='markdown-pre'>{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className='markdown-blockquote'>{children}</blockquote>
          ),
          ul: ({ children }) => <ul className='markdown-list'>{children}</ul>,
          ol: ({ children }) => (
            <ol className='markdown-list markdown-list__ordered'>{children}</ol>
          ),
          li: ({ children }) => (
            <li className='markdown-list-item'>{children}</li>
          ),
          think: ({ children }) => (
            <>
              <h1 className='markdown-think__header'>🤔 Размышление модели:</h1>
              <p className='markdown-think__paragraph'>{children}</p>
            </>
          ),
        }}>
        {processedContent}
      </Markdown>
    </div>
  );
}

export default MarkdownRenderer;
