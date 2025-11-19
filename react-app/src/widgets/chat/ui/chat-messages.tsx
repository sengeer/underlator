/**
 * @module ChatMessages
 * Компонент для отображения списка сообщений чата.
 * Поддерживает виртуализацию и автоматическую прокрутку.
 */

import { useLingui } from '@lingui/react/macro';
import { useState, useRef, useEffect, useCallback } from 'react';
import KeyboardDoubleArrowDownIcon from '../../../shared/assets/icons/keyboard-double-arrow-down';
import WithAdaptiveSize from '../../../shared/lib/hocs/with-adaptive-size';
import useIntersectionObserver from '../../../shared/lib/hooks/use-intersection-observer';
import DecorativeTextAndIconButton from '../../../shared/ui/decorative-text-and-icon-button';
import IconButton from '../../../shared/ui/icon-button';
import Loader from '../../../shared/ui/loader';
import type {
  ChatMessagesProps,
  ChatMessagesState,
} from '../types/chat-messages';
import MessageBubble from './message-bubble';
import '../styles/chat-messages.scss';
import '../styles/empty-state.scss';

function ChatMessages({
  messages,
  isGenerating = false,
  className = '',
}: ChatMessagesProps) {
  const { t } = useLingui();
  const [state, setState] = useState<ChatMessagesState>({
    autoScroll: true,
    lastMessageCount: messages.length,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { ref: intersectionRef, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
  });

  /**
   * Прокручивает к последнему сообщению.
   */
  function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Обрабатывает прокрутку контейнера.
   */
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setState((prev) => ({
      ...prev,
      autoScroll: isNearBottom,
    }));
  }, []);

  /**
   * Обрабатывает клик по кнопке прокрутки.
   */
  const handleScrollToBottomClick = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Обновление состояния при изменении количества сообщений
  useEffect(() => {
    if (messages.length !== state.lastMessageCount) {
      setState((prev) => ({
        ...prev,
        lastMessageCount: messages.length,
      }));

      // Автоматическая прокрутка к последнему сообщению
      if (state.autoScroll) {
        scrollToBottom();
      }
    }
  }, [messages.length, state.autoScroll, state.lastMessageCount]);

  /**
   * Рендерит индикатор генерации ответа.
   */
  function renderGeneratingIndicator() {
    if (!isGenerating) return null;

    return (
      <DecorativeTextAndIconButton
        style={{ padding: '0 0 2rem' }}
        text={t`generating...`}
        decorativeColor='var(--main)'>
        <Loader />
      </DecorativeTextAndIconButton>
    );
  }

  useEffect(() => {
    if (isGenerating) {
      scrollToBottom();
    }
  }, [isGenerating]);

  /**
   * Рендерит пустое состояние.
   */
  function renderEmptyState() {
    if (messages.length > 0) return null;

    return (
      <div className='empty-state'>
        <h2 className='text-heading-l empty-state__title'>{t`start a new conversation`}</h2>
        <p className='text-body-m empty-state__description'>
          {t`Send a message to start chatting with the assistant`}
        </p>
      </div>
    );
  }

  /**
   * Рендерит кнопку прокрутки к низу.
   */
  function renderScrollToBottomButton() {
    if (state.autoScroll || messages.length === 0) return null;

    return (
      <>
        <IconButton
          className='chat-messages__scroll-to-bottom'
          onClick={handleScrollToBottomClick}>
          <WithAdaptiveSize WrappedComponent={KeyboardDoubleArrowDownIcon} />
        </IconButton>
      </>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={`chat-messages ${className}`}
      onScroll={handleScroll}>
      {renderEmptyState()}

      {messages.map((message, index) => (
        <div
          className='chat-messages__item'
          key={message.id}
          ref={index === messages.length - 1 ? intersectionRef : undefined}>
          <MessageBubble
            message={message}
            isVisible={isVisible || index >= messages.length - 10}
          />
        </div>
      ))}

      {renderGeneratingIndicator()}

      {/* Невидимый элемент для прокрутки */}
      <div ref={messagesEndRef} />

      {renderScrollToBottomButton()}
    </div>
  );
}

export default ChatMessages;
