/**
 * @module Chat
 * Основной компонент для управления интерфейсом чата.
 * Интегрируется с useModel для взаимодействия с LLM моделями.
 */

import { useLingui } from '@lingui/react/macro';
import { useState, useEffect, useCallback, startTransition } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import TextareaAutosize from 'react-textarea-autosize';
import { electron as chatElectron } from '../../../shared/apis/chat-ipc';
import { electron as ragElectron } from '../../../shared/apis/rag-ipc';
import AddIcon from '../../../shared/assets/icons/add-icon';
import AttachFileIcon from '../../../shared/assets/icons/attach-file';
import MenuIcon from '../../../shared/assets/icons/menu-icon';
import StopCircleIcon from '../../../shared/assets/icons/stop-circle-icon';
import useModel from '../../../shared/lib/hooks/use-model';
import callANotificationWithALog from '../../../shared/lib/utils/call-a-notification-with-a-log';
import { addNotification } from '../../../shared/models/notifications-slice';
import { selectProviderSettings } from '../../../shared/models/provider-settings-slice';
import Gradient from '../../../shared/ui/gradient';
import IconButton from '../../../shared/ui/icon-button';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import TextButton from '../../../shared/ui/text-button';
import TextButtonFilled from '../../../shared/ui/text-button-filled';
import type { ChatState } from '../types/chat';
import ChatMessages from './chat-messages';
import ChatSidebar from './chat-sidebar';
import '../styles/chat.scss';
import '../styles/empty-state.scss';

function Chat() {
  const { t } = useLingui();
  const { generate, status, stop } = useModel();
  const { provider, settings } = useSelector(selectProviderSettings);

  const dispatch = useDispatch();

  const [state, setState] = useState<ChatState>({
    chats: [],
    activeChat: null,
    isLoading: false,
    messageText: '',
    isGenerating: false,
    error: null,
    showSidebar: false,
  });

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
      callANotificationWithALog(dispatch, t`Failed to load chats`, error);
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
      callANotificationWithALog(dispatch, t`Failed to load chat`, error);
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
        title: `${t`new chat`} ${new Date().toLocaleString('ru-RU')}`,
        defaultModel: {
          name: settings[provider]?.model || 'qwen3:0.6b',
          provider: provider || 'Ollama',
        },
        generationSettings: {
          temperature: 0.7,
          maxTokens: 2048,
        },
      });

      if (result.success && result.data) {
        // Обновляет список чатов
        await loadChats();
        // Выбирает новый чат
        handleSelectChat(result.data.id);
      }
    } catch (error) {
      callANotificationWithALog(dispatch, t`Failed to create chat`, error);
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

      // Если удаляемый чат был активным, очищает выбор
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
          chatId: state.activeChat.id,
          saveHistory: true,
        },
        {
          think: true,
          temperature: 0.7,
          max_tokens: 2048,
        }
      ).chat();

      // Обновляет чат после генерации
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
   * Обрабатывает переключение боковой панели.
   */
  const handleToggleSidebar = useCallback(() => {
    startTransition(() =>
      setState((prev) => ({ ...prev, showSidebar: !prev.showSidebar }))
    );
  }, []);

  async function uploadAndProcessDocument() {
    try {
      // Создает скрытый input элемент для выбора файла
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';

      input.onchange = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
          return;
        }

        try {
          if (!state.activeChat) {
            throw Error;
          }

          setState((prev) => ({ ...prev, isGenerating: true }));

          // Использует uploadAndProcessDocument для загрузки и обработки
          const result = await ragElectron.uploadAndProcessDocument(
            file,
            state.activeChat.id
          );

          if (result.success) {
            dispatch(
              addNotification({
                type: 'success',
                message: file.name + t` file is attached!`,
              })
            );

            setState((prev) => ({ ...prev, isGenerating: false }));
          }
        } catch (error) {
          callANotificationWithALog(dispatch, t`File processing error`, error);
        }
      };

      input.click();
    } catch (error) {
      callANotificationWithALog(
        dispatch,
        t`Error when selecting a file`,
        error
      );
    }
  }

  /**
   * Рендерит пустое состояние.
   */
  function renderEmptyState() {
    if (state.activeChat || state.isLoading) return null;

    return (
      <div className='empty-state'>
        <h2 className='text-heading-l empty-state__title'>{t`welcome to chat`}</h2>
        <p className='text-body-m empty-state__description'>
          {t`Select an existing chat or create a new one to start communicating with the` +
            ` ${settings[provider]?.model}`}
        </p>
        <IconButton onClick={handleCreateChat}>
          <AddIcon />
        </IconButton>
      </div>
    );
  }

  // Загрузка списка чатов при открытии компонента
  useEffect(() => {
    loadChats();
  }, []);

  // Обновление состояния генерации при изменении статуса useModel
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isGenerating: status === 'process',
    }));
  }, [status]);

  return (
    <div className='chat'>
      {/* Боковая панель */}
      {state.showSidebar ? (
        <ChatSidebar
          chats={state.chats}
          activeChatId={state.activeChat?.id}
          isLoading={state.isLoading}
          onCreateChat={handleCreateChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onRefreshChats={loadChats}
        />
      ) : null}

      {/* Основная область */}
      <div className='chat__main'>
        <div className='chat__bar'>
          <div className='chat__actions'>
            <TextAndIconButton onClick={handleToggleSidebar} text={t`chats`}>
              <MenuIcon />
            </TextAndIconButton>
            <p className='text-body-m chat__chat-info'>
              {state.activeChat ? state.activeChat.title : '...'}
            </p>
          </div>
        </div>

        {/* Сообщения */}
        <div className='chat__messages'>
          <Gradient
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          />
          {renderEmptyState()}

          {state.activeChat && (
            <ChatMessages
              messages={state.activeChat.messages}
              isGenerating={state.isGenerating}
            />
          )}

          <Gradient
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              transform: 'rotate(180deg)',
            }}
          />
        </div>

        {/* Поле ввода */}
        {state.activeChat && (
          <div className='chat__bar'>
            <div className='chat__actions'>
              <TextareaAutosize
                className='text-heading-l chat__textarea'
                value={state.messageText}
                placeholder={t`ask ` + settings[provider]?.model || ''}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                disabled={state.isGenerating}
                minRows={1}
                maxRows={5}
              />
            </div>
            <div className='chat__actions'>
              {status === 'process' ? (
                <TextAndIconButton
                  text={t`stop`}
                  onClick={handleStopGeneration}>
                  <StopCircleIcon />
                </TextAndIconButton>
              ) : (
                <div className='chat__btns-container'>
                  <TextButtonFilled text='enter' isDisabled />
                  <TextButton
                    text={t`send`}
                    onClick={handleSendMessage}
                    isDisabled={!state.messageText.trim()}
                  />
                </div>
              )}
              <TextAndIconButton
                text={t`attach file`}
                onClick={() => uploadAndProcessDocument()}>
                <AttachFileIcon />
              </TextAndIconButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
