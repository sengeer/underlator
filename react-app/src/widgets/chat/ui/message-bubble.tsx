/**
 * @module MessageBubble
 * Компонент для отображения отдельных сообщений чата.
 * Поддерживает различные типы сообщений и копирование.
 */

import { useLingui } from '@lingui/react/macro';
import { useRef, useEffect } from 'react';
import CheckIcon from '../../../shared/assets/icons/check-icon';
import CopyIcon from '../../../shared/assets/icons/copy-icon';
import useCopying from '../../../shared/lib/hooks/use-copying';
import AnimatingWrapper from '../../../shared/ui/animating-wrapper';
import IconButton from '../../../shared/ui/icon-button';
import MarkdownRenderer from '../../../shared/ui/markdown-renderer';
import Tail from '../assets/tail';
import type { MessageBubbleProps } from '../types/message-bubble';
import '../styles/message-bubble.scss';

function MessageBubble({
  message,
  isVisible = true,
  className = '',
}: MessageBubbleProps) {
  const { isCopied, handleCopy } = useCopying();

  const { t } = useLingui();

  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Определяет CSS класс для роли сообщения.
   */
  function getRoleClass() {
    switch (message.role) {
      case 'user':
        return 'message-bubble__content_user';
      case 'assistant':
        return 'message-bubble__content_assistant';
      case 'system':
        return 'message-bubble__content_system';
      default:
        return 'message-bubble__content_assistant';
    }
  }

  /**
   * Форматирует временную метку для отображения.
   */
  function formatTimestamp(timestamp: string) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  /**
   * Получает название роли для отображения.
   */
  function getRoleLabel() {
    switch (message.role) {
      case 'user':
        return t`user` + ' ' + formatTimestamp(message.timestamp);
      case 'assistant':
        return message.model
          ? `${message.model.name} ${formatTimestamp(message.timestamp)}`
          : t`assistant` + ' ' + formatTimestamp(message.timestamp);
      case 'system':
        return t`system` + ' ' + formatTimestamp(message.timestamp);
      default:
        return t`unknown`;
    }
  }

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`message-bubble ${className}`}>
      {/* Содержимое сообщения */}
      <div className={`message-bubble__content ${getRoleClass()}`}>
        <MarkdownRenderer
          content={message.content}
          className='message-bubble__output'
          showThinking
          text={getRoleLabel()}
        />
        <IconButton
          style={{
            position: 'absolute',
            right: '1rem',
            top: '1rem',
          }}
          onClick={() => handleCopy(message.content)}>
          <AnimatingWrapper isShow={isCopied}>
            <CheckIcon />
          </AnimatingWrapper>
          <AnimatingWrapper isShow={!isCopied}>
            <CopyIcon />
          </AnimatingWrapper>
        </IconButton>
      </div>
      {message.role === 'user' ? (
        <Tail
          style={{
            transform: 'scaleX(-1)',
            alignSelf: 'flex-end',
            margin: '0 5rem 0 10rem',
          }}
          color='var(--main)'
        />
      ) : (
        <Tail
          style={{ alignSelf: 'flex-start', margin: '0 10rem 0 5rem' }}
          color='var(--accent)'
        />
      )}
    </div>
  );
}

export default MessageBubble;
