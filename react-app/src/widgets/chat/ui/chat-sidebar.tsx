/**
 * @module ChatSidebar
 * Компонент боковой панели со списком чатов.
 * Поддерживает создание, выбор, поиск и удаление чатов.
 */

import { useLingui } from '@lingui/react/macro';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { electron as chatElectron } from '../../../shared/apis/chat-ipc';
import { ChatFile } from '../../../shared/apis/chat-ipc/types/chat-ipc';
import { electron as ragElectron } from '../../../shared/apis/rag-ipc';
import AddIcon from '../../../shared/assets/icons/add-icon';
import splitByWordCount from '../../../shared/lib/utils/split-by-word-count';
import splittingContentOfModel from '../../../shared/lib/utils/splitting-content-of-model';
import { addNotification } from '../../../shared/models/notifications-slice';
import IconButton from '../../../shared/ui/icon-button';
import Search from '../../../shared/ui/search';
import SelectorOption from '../../../shared/ui/selector-option';
import TextButton from '../../../shared/ui/text-button/text-button';
import type { ChatSidebarProps, ChatSidebarState } from '../types/chat-sidebar';
import '../styles/chat-sidebar.scss';

function ChatSidebar({
  isOpened,
  chats,
  activeChatId,
  isLoading = false,
  onCreateChat,
  onSelectChat,
  onDeleteChat,
  onRefreshChats,
}: ChatSidebarProps) {
  const [state, setState] = useState<ChatSidebarState>({
    searchQuery: '',
    filteredChats: chats,
    showActionsMenu: null,
    confirmDelete: null,
  });

  const { t } = useLingui();

  const dispatch = useDispatch();

  const getMainContent = useCallback((message: string) => {
    const { mainContentParts } = splittingContentOfModel(message);
    return mainContentParts;
  }, []);

  /**
   * Обрабатывает изменение поискового запроса.
   */
  const handleSearchChange = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      searchQuery: value,
    }));
  }, []);

  /**
   * Обрабатывает создание нового чата.
   */
  const handleCreateChat = useCallback(async () => {
    onCreateChat?.();
  }, [onCreateChat]);

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
        const resultOfDeletingChat = await chatElectron.deleteChat({
          chatId,
          createBackup: true,
          confirmed: true,
        });

        const resultOfDeletingCollection =
          await ragElectron.deleteDocumentCollection({ chatId });

        if (
          resultOfDeletingChat.success &&
          resultOfDeletingCollection.success
        ) {
          onDeleteChat?.(chatId);
          onRefreshChats?.();

          // Если удаляемый чат был активным, очищает выбор
          if (activeChatId === chatId) {
            onSelectChat?.('');
          }
        }
      } catch (error) {
        dispatch(
          addNotification({
            type: 'error',
            message: t`Failed to load chats`,
          })
        );
        console.error('Failed to delete chat:', error);
      }
    },
    [onDeleteChat, onRefreshChats, onSelectChat, activeChatId]
  );

  /**
   * Обрабатывает выполнение удаления.
   */
  const handleExecuteDelete = useCallback(
    (chatId: string) => {
      handleDeleteChat(chatId);
      setState((prev) => ({
        ...prev,
        confirmDelete: null,
      }));
    },
    [state.confirmDelete, handleDeleteChat]
  );

  /**
   * Рендерит пустое состояние.
   */
  const renderEmptyState = useCallback(() => {
    if (state.filteredChats.length > 0) return null;

    return (
      <div className='chat-sidebar__empty-state'>
        <h3 className='chat-sidebar__empty-state-title'>
          {state.searchQuery ? t`no chats found` : t`no chats`}
        </h3>
        <p className='chat-sidebar__empty-state-description'>
          {state.searchQuery
            ? t`Try changing your search query`
            : t`Create your first chat`}
        </p>
      </div>
    );
  }, [state.filteredChats.length, state.searchQuery]);

  // Обновление отфильтрованного списка при изменении чатов или поискового запроса
  useEffect(() => {
    const filtered = chats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        (chat.lastMessage &&
          chat.lastMessage.content
            .toLowerCase()
            .includes(state.searchQuery.toLowerCase()))
    );

    setState((prev) => ({
      ...prev,
      filteredChats: filtered,
    }));
  }, [chats, state.searchQuery]);

  return (
    <div className={`chat-sidebar${isOpened ? ' chat-sidebar_open' : ''}`}>
      <Search
        placeholder={t`Chat...`}
        value={state.searchQuery}
        onChange={handleSearchChange}
        debounceMs={300}
        hotkey='Ctrl+k'
        showSearchIcon
      />

      <div className='chat-sidebar__chats-list'>
        {renderEmptyState()}

        {state.filteredChats.map((chat: ChatFile) => (
          <SelectorOption
            type='bar'
            key={chat.id}
            state='installed'
            onClick={() => {
              handleSelectChat(chat.id);
            }}
            actionHandlers={{
              onRemove: () => {
                handleExecuteDelete(chat.id);
              },
            }}>
            <>
              <TextButton
                className='chat-sidebar__date-btn'
                text={chat.messageCount}
                isDisabled
              />
              <TextButton
                className='chat-sidebar__chat-btn'
                text={
                  chat.lastMessage
                    ? getMainContent(chat.lastMessage.content)
                    : splitByWordCount(chat.title, 2)[0]
                }
                isDisabled
                isActiveStyle={activeChatId === chat.id}
              />
              <TextButton
                className='chat-sidebar__date-btn'
                text={splitByWordCount(chat.title, 2)[1]}
                isDisabled
              />
            </>
          </SelectorOption>
        ))}
        <IconButton
          className='chat-sidebar__add-btn'
          onClick={handleCreateChat}
          isDisabled={isLoading}>
          <AddIcon />
        </IconButton>
      </div>
    </div>
  );
}

export default ChatSidebar;
