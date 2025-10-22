/**
 * @module ChatSidebar
 * Компонент боковой панели со списком чатов.
 * Поддерживает создание, выбор, поиск и удаление чатов.
 */

import { useLingui } from '@lingui/react/macro';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { electron as chatElectron } from '../../../shared/apis/chat-ipc';
import { ChatFile } from '../../../shared/apis/chat-ipc/types/chat-ipc';
import AddIcon from '../../../shared/assets/icons/add-icon';
import DeleteIcon from '../../../shared/assets/icons/delete-icon';
import ForumIcon from '../../../shared/assets/icons/forum-icon';
import SearchIcon from '../../../shared/assets/icons/search-icon';
import SyncIcon from '../../../shared/assets/icons/sync-icon';
import IconButton from '../../../shared/ui/icon-button';
import TextButton from '../../../shared/ui/text-button/text-button';
import type { ChatSidebarProps, ChatSidebarState } from '../types/chat-sidebar';
import '../styles/chat-sidebar.scss';

function ChatSidebar({
  chats,
  activeChatId,
  isLoading = false,
  onCreateChat,
  onSelectChat,
  onDeleteChat,
  onRefreshChats,
  className = '',
}: ChatSidebarProps) {
  const { t } = useLingui();
  const [state, setState] = useState<ChatSidebarState>({
    searchQuery: '',
    filteredChats: chats,
    showActionsMenu: null,
    confirmDelete: null,
  });

  // Обновление отфильтрованного списка при изменении чатов или поискового запроса
  useEffect(() => {
    const filtered = chats.filter((chat) =>
      chat.title.toLowerCase().includes(state.searchQuery.toLowerCase())
    );

    setState((prev) => ({
      ...prev,
      filteredChats: filtered,
    }));
  }, [chats, state.searchQuery]);

  /**
   * Обрабатывает изменение поискового запроса.
   */
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({
        ...prev,
        searchQuery: e.target.value,
      }));
    },
    []
  );

  /**
   * Обрабатывает создание нового чата.
   */
  const handleCreateChat = useCallback(async () => {
    try {
      const result = await chatElectron.createChat({
        title: `Новый чат ${new Date().toLocaleString('ru-RU')}`,
        defaultModel: {
          name: 'qwen3:0.6b',
          provider: 'Ollama',
        },
        systemPrompt: 'Ты полезный ассистент. Отвечай на вопросы пользователя.',
        generationSettings: {
          temperature: 0.7,
          maxTokens: 2048,
        },
      });

      if (result.success && result.data) {
        onCreateChat?.();
        onSelectChat?.(result.data.id);
        onRefreshChats?.();
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  }, [onCreateChat, onSelectChat, onRefreshChats]);

  /**
   * Обрабатывает выбор чата.
   */
  const handleSelectChat = useCallback(
    (chatId: string) => {
      onSelectChat?.(chatId);
    },
    [onSelectChat]
  );

  /**
   * Обрабатывает удаление чата.
   */
  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      try {
        const result = await chatElectron.deleteChat({
          chatId,
          createBackup: true,
          confirmed: true,
        });

        if (result.success) {
          onDeleteChat?.(chatId);
          onRefreshChats?.();

          // Если удаляемый чат был активным, очищаем выбор
          if (activeChatId === chatId) {
            onSelectChat?.('');
          }
        }
      } catch (error) {
        console.error('Failed to delete chat:', error);
      }
    },
    [onDeleteChat, onRefreshChats, onSelectChat, activeChatId]
  );

  /**
   * Обрабатывает обновление списка чатов.
   */
  const handleRefreshChats = useCallback(() => {
    onRefreshChats?.();
  }, [onRefreshChats]);

  /**
   * Обрабатывает показ меню действий.
   */
  const handleShowActionsMenu = useCallback((chatId: string) => {
    setState((prev) => ({
      ...prev,
      showActionsMenu: prev.showActionsMenu === chatId ? null : chatId,
    }));
  }, []);

  /**
   * Обрабатывает подтверждение удаления.
   */
  const handleConfirmDelete = useCallback((chatId: string) => {
    setState((prev) => ({
      ...prev,
      confirmDelete: chatId,
      showActionsMenu: null,
    }));
  }, []);

  /**
   * Обрабатывает отмену удаления.
   */
  const handleCancelDelete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      confirmDelete: null,
    }));
  }, []);

  /**
   * Обрабатывает выполнение удаления.
   */
  const handleExecuteDelete = useCallback(() => {
    if (state.confirmDelete) {
      handleDeleteChat(state.confirmDelete);
      setState((prev) => ({
        ...prev,
        confirmDelete: null,
      }));
    }
  }, [state.confirmDelete, handleDeleteChat]);

  /**
   * Форматирует дату для отображения.
   */
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return 'Сегодня';
      } else if (diffDays === 2) {
        return 'Вчера';
      } else if (diffDays <= 7) {
        return `${diffDays - 1} дн. назад`;
      } else {
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        });
      }
    } catch {
      return '';
    }
  }, []);

  /**
   * Рендерит пустое состояние.
   */
  const renderEmptyState = useCallback(() => {
    if (state.filteredChats.length > 0) return null;

    return (
      <div className='chat-sidebar__empty-state'>
        <div className='chat-sidebar__empty-state-icon'>
          <ForumIcon />
        </div>
        <h3 className='chat-sidebar__empty-state-title'>
          {state.searchQuery ? t`No chats found` : t`No chats`}
        </h3>
        <p className='chat-sidebar__empty-state-description'>
          {state.searchQuery
            ? t`Try changing your search query`
            : t`Create your first chat to start a conversation`}
        </p>
      </div>
    );
  }, [state.filteredChats.length, state.searchQuery]);

  /**
   * Рендерит состояние загрузки.
   */
  const renderLoadingState = useCallback(() => {
    if (!isLoading) return null;

    return (
      <div className='chat-sidebar__loading-state'>
        <div className='chat-sidebar__loading-state-spinner' />
        <p className='chat-sidebar__loading-state-text'>{t`Loading chats...`}</p>
      </div>
    );
  }, [isLoading]);

  /**
   * Рендерит элемент чата.
   */
  const renderChatItem = useCallback(
    (chat: ChatFile) => {
      const isActive = activeChatId === chat.id;
      const isConfirmingDelete = state.confirmDelete === chat.id;

      return (
        <div
          key={chat.id}
          className={`chat-sidebar__chat-item ${
            isActive ? 'chat-sidebar__chat-item_active' : ''
          } ${isLoading ? 'chat-sidebar__chat-item_loading' : ''}`}
          onClick={() => !isConfirmingDelete && handleSelectChat(chat.id)}>
          {isConfirmingDelete ? (
            <div className='chat-sidebar__confirm-delete'>
              <div className='chat-sidebar__confirm-delete-title'>
                {t`Delete chat?`}
              </div>
              <div className='chat-sidebar__confirm-delete-actions'>
                <TextButton
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleCancelDelete();
                  }}
                  className='chat-sidebar__button'>
                  {t`Cancel`}
                </TextButton>
                <TextButton
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleExecuteDelete();
                  }}
                  className='chat-sidebar__button'>
                  {t`Delete`}
                </TextButton>
              </div>
            </div>
          ) : (
            <>
              <div className='chat-sidebar__chat-content'>
                <div className='chat-sidebar__chat-header'>
                  <h4 className='chat-sidebar__chat-title'>{chat.title}</h4>
                  <div className='chat-sidebar__chat-actions'>
                    <IconButton
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleConfirmDelete(chat.id);
                      }}
                      title={t`Delete chat`}>
                      <DeleteIcon />
                    </IconButton>
                  </div>
                </div>

                {chat.lastMessage && (
                  <p className='chat-sidebar__chat-preview'>
                    {chat.lastMessage.preview}
                  </p>
                )}

                <div className='chat-sidebar__chat-meta'>
                  <span>{formatDate(chat.updatedAt)}</span>
                  {chat.messageCount > 0 && (
                    <span className='chat-sidebar__chat-message-count'>
                      {chat.messageCount}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      );
    },
    [
      activeChatId,
      isLoading,
      state.confirmDelete,
      handleSelectChat,
      handleCancelDelete,
      handleExecuteDelete,
      handleConfirmDelete,
      formatDate,
    ]
  );

  return (
    <div className={`chat-sidebar ${className}`}>
      {/* Заголовок и поиск */}
      <div className='chat-sidebar__header'>
        <h2 className='chat-sidebar__title'>{t`Chats`}</h2>

        <div className='chat-sidebar__search'>
          <div className='chat-sidebar__search-icon'>
            <SearchIcon />
          </div>
          <input
            className='chat-sidebar__search-input'
            type='text'
            placeholder={t`Search chats...`}
            value={state.searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className='chat-sidebar__actions'>
          <TextButton
            onClick={handleCreateChat}
            disabled={isLoading}
            className='chat-sidebar__button'>
            {t`Add new chat`}
          </TextButton>

          <IconButton
            onClick={handleRefreshChats}
            disabled={isLoading}
            title={t`Refresh chat list`}>
            <SyncIcon />
          </IconButton>
        </div>
      </div>

      {/* Содержимое */}
      <div className='chat-sidebar__content'>
        {renderLoadingState()}

        {!isLoading && (
          <div className='chat-sidebar__chats-list'>
            {state.filteredChats.map(renderChatItem)}
            {renderEmptyState()}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatSidebar;
