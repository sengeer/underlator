/**
 * @module MessageBubbleTypes
 * Типы для компонента MessageBubble.
 * Определяет интерфейсы для отображения отдельных сообщений чата.
 */

import type { ChatMessage } from '../../../shared/apis/chat-ipc/types/chat-ipc';

/**
 * Пропсы компонента MessageBubble.
 */
export interface MessageBubbleProps {
  /** Сообщение чата для отображения */
  message: ChatMessage;
  /** Флаг видимости компонента для ленивой загрузки */
  isVisible?: boolean;
  /** Callback для копирования текста сообщения */
  onCopy?: (text: string) => void;
  /** Callback для редактирования сообщения */
  onEdit?: (messageId: string, newContent: string) => void;
  /** Callback для удаления сообщения */
  onDelete?: (messageId: string) => void;
  /** Дополнительные CSS классы */
  className?: string;
}

/**
 * Состояние компонента MessageBubble.
 */
export interface MessageBubbleState {
  /** Флаг показа меню действий */
  showActions: boolean;
  /** Флаг режима редактирования */
  isEditing: boolean;
  /** Текст для редактирования */
  editText: string;
  /** Флаг копирования текста */
  isCopied: boolean;
}
