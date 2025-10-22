/**
 * @module ChatMessages
 * Компонент для отображения списка сообщений чата.
 * Поддерживает виртуализацию и автоматическую прокрутку.
 */

import { useLingui } from '@lingui/react/macro';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import useIntersectionObserver from '../../../shared/lib/hooks/use-intersection-observer';
import type {
  ChatMessagesProps,
  ChatMessagesState,
} from '../types/chat-messages';
import MessageBubble from './message-bubble';
import '../styles/chat-messages.scss';

function ChatMessages({
  messages,
  isGenerating = false,
  onScrollToBottom,
  onCopyMessage,
  onEditMessage,
  onDeleteMessage,
  className = '',
}: ChatMessagesProps) {
  const { t } = useLingui();
  const [state, setState] = useState<ChatMessagesState>({
    autoScroll: true,
    scrollContainer: null,
    lastMessageCount: messages.length,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { ref: intersectionRef, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
  });

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

  // Инициализация контейнера прокрутки
  useEffect(() => {
    if (scrollContainerRef.current) {
      setState((prev) => ({
        ...prev,
        scrollContainer: scrollContainerRef.current,
      }));
    }
  }, []);

  /**
   * Прокручивает к последнему сообщению.
   */
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

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
   * Обрабатывает копирование сообщения.
   */
  const handleCopyMessage = useCallback(
    (text: string) => {
      onCopyMessage?.(text);
    },
    [onCopyMessage]
  );

  /**
   * Обрабатывает редактирование сообщения.
   */
  const handleEditMessage = useCallback(
    (messageId: string, newContent: string) => {
      onEditMessage?.(messageId, newContent);
    },
    [onEditMessage]
  );

  /**
   * Обрабатывает удаление сообщения.
   */
  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      onDeleteMessage?.(messageId);
    },
    [onDeleteMessage]
  );

  /**
   * Обрабатывает клик по кнопке прокрутки.
   */
  const handleScrollToBottomClick = useCallback(() => {
    scrollToBottom();
    onScrollToBottom?.();
  }, [scrollToBottom, onScrollToBottom]);

  /**
   * Рендерит индикатор генерации ответа.
   */
  const renderGeneratingIndicator = () => {
    if (!isGenerating) return null;

    return (
      <div className='chat-messages__generating-indicator'>
        <div className='chat-messages__generating-indicator-dot' />
        <div className='chat-messages__generating-indicator-dot' />
        <div className='chat-messages__generating-indicator-dot' />
        <span>{t`Generating response...`}</span>
      </div>
    );
  };

  /**
   * Рендерит пустое состояние.
   */
  const renderEmptyState = () => {
    if (messages.length > 0) return null;

    return (
      <div className='chat-messages__empty-state'>
        <div className='chat-messages__empty-state-icon'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='100%'
            height='100%'
            viewBox='0 -960 960 960'
            fill='currentColor'>
            <path d='M880-80 720-240H320q-33 0-56.5-23.5T240-320v-40h440q33 0 56.5-23.5T760-440v-280h40q33 0 56.5 23.5T880-640v560ZM160-473l47-47h393v-280H160v327ZM80-280v-520q0-33 23.5-56.5T160-880h440q33 0 56.5 23.5T680-800v280q0 33-23.5 56.5T600-440H240L80-280Zm80-240v-280 280Z' />
          </svg>
        </div>
        <h3 className='chat-messages__empty-state-title'>
          {t`Start a new conversation`}
        </h3>
        <p className='chat-messages__empty-state-description'>
          {t`Send a message to start chatting with the assistant`}
        </p>
      </div>
    );
  };

  /**
   * Рендерит кнопку прокрутки к низу.
   */
  const renderScrollToBottomButton = () => {
    if (state.autoScroll || messages.length === 0) return null;

    return (
      <button
        className={`chat-messages__scroll-to-bottom ${
          !state.autoScroll ? 'chat-messages__scroll-to-bottom_visible' : ''
        }`}
        onClick={handleScrollToBottomClick}
        title='Прокрутить к последнему сообщению'
        type='button'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='100%'
          height='100%'
          viewBox='0 -960 960 960'
          fill='currentColor'>
          <path d='M480-160 160-480l56-57 224 224 224-224 56 57-320 320Zm0-320L160-800l56-57 224 224 224-224 56 57-320 320Z' />
        </svg>
      </button>
    );
  };

  return (
    <div className={`chat-messages ${className}`}>
      <div
        ref={scrollContainerRef}
        className='chat-messages__container'
        onScroll={handleScroll}>
        <div className='chat-messages__messages-list'>
          {renderEmptyState()}

          {messages.map((message, index) => (
            <div
              key={message.id}
              ref={index === messages.length - 1 ? intersectionRef : undefined}>
              <MessageBubble
                message={message}
                isVisible={isVisible || index >= messages.length - 10}
                onCopy={handleCopyMessage}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
            </div>
          ))}

          {renderGeneratingIndicator()}

          {/* Невидимый элемент для прокрутки */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {renderScrollToBottomButton()}
    </div>
  );
}

export default ChatMessages;
