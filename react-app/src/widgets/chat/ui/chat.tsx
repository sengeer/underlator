/**
 * @module Chat
 * Основной компонент для управления интерфейсом чата.
 * Интегрируется с useModel для взаимодействия с LLM моделями.
 */

import { useLingui } from '@lingui/react/macro';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { electron as chatElectron } from '../../../shared/apis/chat-ipc';
import type {
  ChatData,
  ChatFile,
  ChatMessage,
} from '../../../shared/apis/chat-ipc/types/chat-ipc';
import BackspaceIcon from '../../../shared/assets/icons/backspace-icon';
import CheckIcon from '../../../shared/assets/icons/check-icon';
import CopyIcon from '../../../shared/assets/icons/copy-icon';
import ForumIcon from '../../../shared/assets/icons/forum-icon';
import MenuIcon from '../../../shared/assets/icons/menu-icon';
import StopCircleIcon from '../../../shared/assets/icons/stop-circle-icon';
import useCopying from '../../../shared/lib/hooks/use-copying';
import useModel from '../../../shared/lib/hooks/use-model';
import { selectProviderSettings } from '../../../shared/models/provider-settings-slice';
import AnimatingWrapper from '../../../shared/ui/animating-wrapper';
import IconButton from '../../../shared/ui/icon-button';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import TextButton from '../../../shared/ui/text-button/text-button';
import type { ChatProps, ChatState } from '../types/chat';
import ChatMessages from './chat-messages';
import ChatSidebar from './chat-sidebar';
import '../styles/chat.scss';

function Chat({ isOpened, onClose, className = '' }: ChatProps) {
  const { t } = useLingui();
  const { isCopied, handleCopy } = useCopying();
  const { generate, status, generatedResponse, stop } = useModel();
  const { provider, settings } = useSelector(selectProviderSettings);

  const [state, setState] = useState<ChatState>({
    chats: [],
    activeChat: null,
    isLoading: false,
    messageText: '',
    isGenerating: false,
    error: null,
    showSidebar: true,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Загрузка списка чатов при открытии компонента
  useEffect(() => {
    if (isOpened) {
      loadChats();
    }
  }, [isOpened]);

  // Обновление состояния генерации при изменении статуса useModel
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isGenerating: status === 'process',
    }));
  }, [status]);

  // Обработка сгенерированного ответа
  useEffect(() => {
    if (
      generatedResponse &&
      typeof generatedResponse === 'string' &&
      status === 'success'
    ) {
      // Здесь можно добавить логику для отображения ответа
      console.log('Generated response:', generatedResponse);
    }
  }, [generatedResponse, status]);

  /**
   * Загружает список всех чатов.
   */
  const loadChats = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await chatElectron.listChats({
        limit: 100,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          chats: result.data!.chats,
          isLoading: false,
        }));
      } else {
        throw new Error(result.error || 'Failed to load chats');
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  /**
   * Загружает конкретный чат по ID.
   */
  const loadChat = useCallback(async (chatId: string) => {
    if (!chatId) {
      setState((prev) => ({ ...prev, activeChat: null }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await chatElectron.getChat({
        chatId,
        includeMessages: true,
        messageLimit: 100,
      });

      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          activeChat: result.data!,
          isLoading: false,
        }));
      } else {
        throw new Error(result.error || 'Failed to load chat');
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  /**
   * Обрабатывает выбор чата.
   */
  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (chatId) {
        loadChat(chatId);
      } else {
        setState((prev) => ({ ...prev, activeChat: null }));
      }
    },
    [loadChat]
  );

  /**
   * Обрабатывает создание нового чата.
   */
  const handleCreateChat = useCallback(async () => {
    try {
      const result = await chatElectron.createChat({
        title: `New chat ${new Date().toLocaleString('en-US')}`,
        defaultModel: {
          name: settings[provider]?.model || 'qwen3:0.6b',
          provider: provider || 'Ollama',
        },
        systemPrompt: 'You are a helpful assistant. Answer user questions.',
        generationSettings: {
          temperature: 0.7,
          maxTokens: 2048,
        },
      });

      if (result.success && result.data) {
        // Обновляем список чатов
        await loadChats();
        // Выбираем новый чат
        handleSelectChat(result.data.id);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  }, [loadChats, handleSelectChat, settings[provider]?.model, provider]);

  /**
   * Обрабатывает удаление чата.
   */
  const handleDeleteChat = useCallback(
    (chatId: string) => {
      setState((prev) => ({
        ...prev,
        chats: prev.chats.filter((chat) => chat.id !== chatId),
      }));

      // Если удаляемый чат был активным, очищаем выбор
      if (state.activeChat?.id === chatId) {
        setState((prev) => ({ ...prev, activeChat: null }));
      }
    },
    [state.activeChat?.id]
  );

  /**
   * Обрабатывает отправку сообщения.
   */
  const handleSendMessage = useCallback(async () => {
    if (!state.messageText.trim() || !state.activeChat || state.isGenerating) {
      return;
    }

    const messageText = state.messageText.trim();
    setState((prev) => ({ ...prev, messageText: '' }));

    try {
      // Генерация ответа через useModel в режиме чата
      await generate(
        messageText,
        {
          responseMode: 'stringStream',
          typeUse: 'chat',
          chatId: state.activeChat.id,
          saveHistory: true,
        },
        {
          temperature: 0.7,
          max_tokens: 2048,
        }
      );

      // Обновляем чат после генерации
      await loadChat(state.activeChat.id);
    } catch (error) {
      console.error('Failed to send message:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [
    state.messageText,
    state.activeChat,
    state.isGenerating,
    generate,
    loadChat,
  ]);

  /**
   * Обрабатывает остановку генерации.
   */
  const handleStopGeneration = useCallback(() => {
    stop();
    setState((prev) => ({ ...prev, isGenerating: false }));
  }, [stop]);

  /**
   * Обрабатывает очистку поля ввода.
   */
  const handleClearInput = useCallback(() => {
    setState((prev) => ({ ...prev, messageText: '' }));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  /**
   * Обрабатывает изменения в поле ввода.
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setState((prev) => ({ ...prev, messageText: e.target.value }));
    },
    []
  );

  /**
   * Обрабатывает нажатие клавиш в поле ввода.
   */
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  /**
   * Обрабатывает копирование сообщения.
   */
  const handleCopyMessage = useCallback((text: string) => {
    // Дополнительная логика при необходимости
    console.log('Message copied:', text);
  }, []);

  /**
   * Обрабатывает редактирование сообщения.
   */
  const handleEditMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!state.activeChat) return;

      try {
        // Здесь можно добавить логику обновления сообщения
        // Пока просто перезагружаем чат
        await loadChat(state.activeChat.id);
      } catch (error) {
        console.error('Failed to edit message:', error);
      }
    },
    [state.activeChat, loadChat]
  );

  /**
   * Обрабатывает удаление сообщения.
   */
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!state.activeChat) return;

      try {
        // Здесь можно добавить логику удаления сообщения
        // Пока просто перезагружаем чат
        await loadChat(state.activeChat.id);
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    },
    [state.activeChat, loadChat]
  );

  /**
   * Обрабатывает переключение боковой панели.
   */
  const handleToggleSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, showSidebar: !prev.showSidebar }));
  }, []);

  /**
   * Рендерит пустое состояние.
   */
  const renderEmptyState = () => {
    if (state.activeChat || state.isLoading) return null;

    return (
      <div className='chat__empty-state'>
        <div className='chat__empty-state-icon'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='100%'
            height='100%'
            viewBox='0 -960 960 960'
            fill='currentColor'>
            <path d='M880-80 720-240H320q-33 0-56.5-23.5T240-320v-40h440q33 0 56.5-23.5T760-440v-280h40q33 0 56.5 23.5T880-640v560ZM160-473l47-47h393v-280H160v327ZM80-280v-520q0-33 23.5-56.5T160-880h440q33 0 56.5 23.5T680-800v280q0 33-23.5 56.5T600-440H240L80-280Zm80-240v-280 280Z' />
          </svg>
        </div>
        <h2 className='chat__empty-state-title'>{t`Welcome to chat`}</h2>
        <p className='chat__empty-state-description'>
          {t`Select an existing chat or create a new one to start communicating with the assistant.`}
        </p>
        <TextButton
          onClick={() => handleCreateChat()}
          className='chat__empty-state-action'>
          {t`Add new chat`}
        </TextButton>
      </div>
    );
  };

  /**
   * Рендерит состояние загрузки.
   */
  const renderLoadingState = () => {
    if (!state.isLoading) return null;

    return (
      <div className='chat__loading-state'>
        <div className='chat__loading-state-spinner' />
        <p className='chat__loading-state-text'>{t`Loading...`}</p>
      </div>
    );
  };

  /**
   * Рендерит состояние ошибки.
   */
  const renderErrorState = () => {
    if (!state.error) return null;

    return (
      <div className='chat__error-state'>
        <div className='chat__error-state-icon'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='100%'
            height='100%'
            viewBox='0 -960 960 960'
            fill='currentColor'>
            <path d='M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z' />
          </svg>
        </div>
        <h3 className='chat__error-state-title'>{t`An error occurred`}</h3>
        <p className='chat__error-state-description'>{state.error}</p>
        <TextButton onClick={loadChats} className='chat__error-state-retry'>
          {t`Try again`}
        </TextButton>
      </div>
    );
  };

  if (!isOpened) {
    return null;
  }

  return (
    <div className={`chat ${isOpened ? 'chat_open' : ''} ${className}`}>
      <div className='chat__container'>
        {/* Боковая панель */}
        {state.showSidebar && (
          <div className='chat__sidebar'>
            <ChatSidebar
              chats={state.chats}
              activeChatId={state.activeChat?.id}
              isLoading={state.isLoading}
              onCreateChat={handleCreateChat}
              onSelectChat={handleSelectChat}
              onDeleteChat={handleDeleteChat}
              onRefreshChats={loadChats}
            />
          </div>
        )}

        {/* Основная область */}
        <div className='chat__main'>
          {/* Заголовок */}
          <div className='chat__header'>
            <div className='chat__header-content'>
              <IconButton
                onClick={handleToggleSidebar}
                title={t`Toggle sidebar`}>
                <MenuIcon />
              </IconButton>

              {state.activeChat ? (
                <div className='chat__chat-info'>
                  <h1 className='chat__chat-title'>{state.activeChat.title}</h1>
                  <div className='chat__chat-meta'>
                    <div className='chat__model-info'>
                      <span>
                        {settings[provider]?.model || 'No model selected'}
                      </span>
                      <span>({provider})</span>
                    </div>
                    <span>
                      {state.activeChat.messages.length} {t`messages`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className='chat__chat-info'>
                  <h1 className='chat__chat-title'>{t`Chat`}</h1>
                </div>
              )}
            </div>

            <div className='chat__header-actions'>
              {state.isGenerating && (
                <IconButton
                  onClick={handleStopGeneration}
                  title={t`Stop generation`}>
                  <StopCircleIcon />
                </IconButton>
              )}
            </div>
          </div>

          {/* Сообщения */}
          <div className='chat__messages'>
            {renderLoadingState()}
            {renderErrorState()}
            {renderEmptyState()}

            {state.activeChat && (
              <ChatMessages
                messages={state.activeChat.messages}
                isGenerating={state.isGenerating}
                onCopyMessage={handleCopyMessage}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
              />
            )}

            {/* Кнопка копирования сгенерированного ответа */}
            {generatedResponse &&
              typeof generatedResponse === 'string' &&
              status === 'success' && (
                <div
                  style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                  <IconButton
                    onClick={() => handleCopy(generatedResponse)}
                    isDisabled={generatedResponse === '' || isCopied}>
                    <AnimatingWrapper isShow={isCopied}>
                      <CheckIcon />
                    </AnimatingWrapper>
                    <AnimatingWrapper isShow={!isCopied}>
                      <CopyIcon />
                    </AnimatingWrapper>
                  </IconButton>
                </div>
              )}
          </div>

          {/* Поле ввода */}
          {state.activeChat && (
            <div className='chat__input-area'>
              <div className='chat__input-container'>
                <div className='chat__input-wrapper'>
                  <textarea
                    ref={textareaRef}
                    className='chat__input'
                    placeholder='Введите сообщение...'
                    value={state.messageText}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    disabled={state.isGenerating}
                    rows={1}
                  />
                  <div className='chat__input-actions'>
                    <span className='chat__input-hint'>
                      {t`Enter to send, Shift+Enter for new line`}
                    </span>
                    <div className='chat__input-buttons'>
                      {state.messageText && (
                        <IconButton
                          style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                          }}
                          onClick={handleClearInput}
                          isDisabled={state.messageText === ''}>
                          <BackspaceIcon />
                        </IconButton>
                      )}
                      {state.isGenerating ? (
                        <TextAndIconButton
                          text={t`stop`}
                          style={{
                            margin: '0 auto 1rem',
                          }}
                          onClick={handleStopGeneration}>
                          <StopCircleIcon />
                        </TextAndIconButton>
                      ) : (
                        <TextAndIconButton
                          text={t`send`}
                          style={{
                            margin: '0 auto 1rem',
                          }}
                          onClick={handleSendMessage}
                          isDisabled={!state.messageText.trim()}>
                          <ForumIcon />
                        </TextAndIconButton>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;
