/**
 * @module ChatSidebarTypes
 * Типы для компонента ChatSidebar.
 * Определяет интерфейсы для боковой панели со списком чатов.
 */

import type { ChatFile } from '../../../shared/apis/chat-ipc/types/chat-ipc';

/**
 * Пропсы компонента ChatSidebar.
 */
export interface ChatSidebarProps {
  /** Список чатов для отображения */
  chats: ChatFile[];
  /** ID активного чата */
  activeChatId?: string;
  /** Флаг загрузки списка чатов */
  isLoading?: boolean;
  /** Callback для создания нового чата */
  onCreateChat?: () => void;
  /** Callback для выбора чата */
  onSelectChat?: (chatId: string) => void;
  /** Callback для удаления чата */
  onDeleteChat?: (chatId: string) => void;
  /** Callback для обновления списка чатов */
  onRefreshChats?: () => void;
}

/**
 * Состояние компонента ChatSidebar.
 */
export interface ChatSidebarState {
  /** Поисковый запрос */
  searchQuery: string;
  /** Отфильтрованный список чатов */
  filteredChats: ChatFile[];
  /** Флаг показа меню действий для чата */
  showActionsMenu: string | null;
  /** Флаг подтверждения удаления */
  confirmDelete: string | null;
}
