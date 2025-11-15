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
  /** Дополнительные CSS классы */
  className?: string;
}
