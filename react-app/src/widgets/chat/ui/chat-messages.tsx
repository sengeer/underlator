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
  currentText = '',
  className = '',
}: ChatMessagesProps) {
  const { t } = useLingui();
  const [state, setState] = useState<ChatMessagesState>({
    lastMessageCount: messages.length,
  });
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const { ref: intersectionRef, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Проверяет, нужно ли показывать кнопку прокрутки вниз.
   * Кнопка скрывается, если:
   * - Нет скроллбара (контент не переполняет контейнер)
   * - Пользователь уже внизу списка сообщений
   * - Идет генерация ответа (происходит автоматическая прокрутка)
   */
  const checkScrollToBottomVisibility = useCallback(() => {
    if (!messagesContainerRef.current || isGenerating) {
      setShowScrollToBottom(false);
      return;
    }

    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 50; // Порог в пикселях для определения "внизу"

    // Проверяет, есть ли скроллбар
    const hasScrollbar = scrollHeight > clientHeight;

    // Проверяет, находится ли пользователь внизу
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold;

    // Показывает кнопку только если есть скроллбар и пользователь не внизу
    setShowScrollToBottom(hasScrollbar && !isAtBottom);
  }, [isGenerating]);

  /**
   * Обрабатывает событие скролла контейнера сообщений.
   */
  const handleScroll = useCallback(() => {
    checkScrollToBottomVisibility();
  }, [checkScrollToBottomVisibility]);

  /**
   * Прокручивает к последнему сообщению.
   */
  function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Обрабатывает клик по кнопке прокрутки.
   */
  const handleScrollToBottomClick = useCallback(() => {
    scrollToBottom();
  }, []);

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

  // Обновление состояния при изменении количества сообщений
  useEffect(() => {
    if (messages.length !== state.lastMessageCount) {
      setState((prev) => ({
        ...prev,
        lastMessageCount: messages.length,
      }));
    }
  }, [messages.length, state.lastMessageCount]);

  // Проверка видимости кнопки при изменении сообщений или генерации
  useEffect(() => {
    // Небольшая задержка для того, чтобы DOM обновился после изменения сообщений
    const timeoutId = setTimeout(() => {
      checkScrollToBottomVisibility();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages.length, isGenerating, checkScrollToBottomVisibility]);

  // Добавление обработчика скролла
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    // Также проверяет при изменении размера контейнера
    const resizeObserver = new ResizeObserver(() => {
      checkScrollToBottomVisibility();
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [handleScroll, checkScrollToBottomVisibility]);

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
   * Кнопка отображается только если:
   * - Есть сообщения
   * - Есть скроллбар (контент переполняет контейнер)
   * - Пользователь не находится внизу списка
   * - Не идет генерация ответа
   */
  function renderScrollToBottomButton() {
    if (messages.length === 0 || !showScrollToBottom) return null;

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

  /**
   * Рендерит стриминговое сообщение ассистента.
   * Обновляет последнее сообщение ассистента текущим текстом стриминга.
   */
  function renderStreamingMessage() {
    if (!isGenerating || !currentText) return null;

    // Находит временное сообщение ассистента
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === 'assistant');

    if (!lastAssistantMessage) return null;

    // Создает сообщение с текущим текстом стриминга
    const streamingMessage = {
      ...lastAssistantMessage,
      content: currentText || '', // Использует currentText для стриминга
    };

    return (
      <div className='chat-messages__item chat-messages__item_streaming'>
        <MessageBubble message={streamingMessage} isVisible={true} />
      </div>
    );
  }

  return (
    <div ref={messagesContainerRef} className={`chat-messages ${className}`}>
      {renderEmptyState()}

      {/* Отображает все сообщения кроме последнего ассистента (если идет стриминг) */}
      {messages.map((message, index) => {
        // Пропускает последнее сообщение ассистента если идет стриминг
        const isLastAssistant =
          isGenerating &&
          message.role === 'assistant' &&
          index === messages.length - 1;

        if (isLastAssistant) return null;

        return (
          <div className='chat-messages__item' key={message.id}>
            <MessageBubble
              message={message}
              isVisible={isVisible || index >= messages.length - 10}
            />
          </div>
        );
      })}

      {/* Отображает стриминговое сообщение */}
      {renderStreamingMessage()}

      {renderGeneratingIndicator()}

      {/* Невидимый элемент для прокрутки */}
      <div ref={messagesEndRef} />

      {renderScrollToBottomButton()}
    </div>
  );
}

export default ChatMessages;
