/**
 * @module ChatTypes
 * Типы для основного компонента Chat.
 * Определяет интерфейсы для управления интерфейсом чата.
 */

import type {
  ChatData,
  ChatFile,
} from '../../../shared/apis/chat-ipc/types/chat-ipc';

/**
 * Состояние компонента Chat.
 */
export interface ChatState {
  /** Список всех чатов */
  chats: ChatFile[];
  /** Активный чат */
  activeChat: ChatData | null;
  /** Флаг загрузки */
  isLoading: boolean;
  /** Текст сообщения для ввода */
  messageText: string;
  /** Флаг генерации ответа */
  isGenerating: boolean;
  /** Ошибка выполнения операции */
  error: string | null;
  /** Флаг показа боковой панели */
  showSidebar: boolean;
}
