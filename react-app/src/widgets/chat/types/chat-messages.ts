/**
 * @module ChatMessagesTypes
 * Типы для компонента ChatMessages.
 * Определяет интерфейсы для отображения списка сообщений чата.
 */

import type { ChatMessage } from '../../../shared/apis/chat-ipc/types/chat-ipc';

/**
 * Пропсы компонента ChatMessages.
 */
export interface ChatMessagesProps {
  /** Массив сообщений чата */
  messages: ChatMessage[];
  /** Флаг генерации ответа */
  isGenerating?: boolean;
  /** Callback для прокрутки к последнему сообщению */
  onScrollToBottom?: () => void;
  /** Callback для копирования текста сообщения */
  onCopyMessage?: (text: string) => void;
  /** Callback для редактирования сообщения */
  onEditMessage?: (messageId: string, newContent: string) => void;
  /** Callback для удаления сообщения */
  onDeleteMessage?: (messageId: string) => void;
  /** Дополнительные CSS классы */
  className?: string;
}

/**
 * Состояние компонента ChatMessages.
 */
export interface ChatMessagesState {
  /** Флаг автоматической прокрутки */
  autoScroll: boolean;
  /** Элемент для прокрутки */
  scrollContainer: HTMLDivElement | null;
  /** Последнее количество сообщений для отслеживания изменений */
  lastMessageCount: number;
}
