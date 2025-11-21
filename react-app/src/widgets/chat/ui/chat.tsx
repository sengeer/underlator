/**
 * @module Chat
 * Основной компонент для управления интерфейсом чата.
 * Интегрируется с useModel для взаимодействия с LLM моделями.
 */

import { useLingui } from '@lingui/react/macro';
import { useState, useEffect, useCallback, startTransition } from 'react';
import { useSelector } from 'react-redux';
import TextareaAutosize from 'react-textarea-autosize';
import { useAppDispatch } from '../../../app/';
import { electron as ragElectron } from '../../../shared/apis/rag-ipc';
import AddIcon from '../../../shared/assets/icons/add-icon';
import AttachFileIcon from '../../../shared/assets/icons/attach-file';
import MenuIcon from '../../../shared/assets/icons/menu-icon';
import StopCircleIcon from '../../../shared/assets/icons/stop-circle-icon';
import useModel from '../../../shared/lib/hooks/use-model';
import callANotificationWithALog from '../../../shared/lib/utils/call-a-notification-with-a-log/call-a-notification-with-a-log';
import { addNotification } from '../../../shared/models/notifications-slice';
import { selectProviderSettings } from '../../../shared/models/provider-settings-slice';
import Gradient from '../../../shared/ui/gradient';
import IconButton from '../../../shared/ui/icon-button';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import TextButton from '../../../shared/ui/text-button';
import TextButtonFilled from '../../../shared/ui/text-button-filled';
import {
  loadChats,
  createChat,
  loadChat,
  setActiveChat,
  setGenerationState,
  selectChatsList,
  selectActiveChat,
  selectGeneration,
} from '../models/chat-ipc-slice';
import ChatMessages from './chat-messages';
import ChatSidebar from './chat-sidebar';
import '../styles/chat.scss';
import '../styles/empty-state.scss';

function Chat() {
  const { t } = useLingui();
  const { generate, status, stop } = useModel();
  const { provider, settings, rag } = useSelector(selectProviderSettings);

  const dispatch = useAppDispatch();

  // Redux состояние
  const chatsList = useSelector(selectChatsList);
  const activeChat = useSelector(selectActiveChat);
  const generation = useSelector(selectGeneration);

  // Локальное состояние для UI-специфичных данных
  const [messageText, setMessageText] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);

  /**
   * Загружает список всех чатов.
   */
  const handleLoadChats = useCallback(async () => {
    dispatch(
      loadChats({
        limit: 100,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      })
    );
  }, [dispatch]);

  /**
   * Обрабатывает выбор чата.
   */
  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (chatId) {
        dispatch(setActiveChat({ chatId, loadFullContent: true }));
        dispatch(
          loadChat({
            chatId,
            includeMessages: true,
            messageLimit: 100,
          })
        );
      } else {
        dispatch(setActiveChat({ chatId: null }));
      }
    },
    [dispatch]
  );

  /**
   * Обрабатывает создание нового чата.
   */
  const handleCreateChat = useCallback(async () => {
    const result = await dispatch(
      createChat({
        title: `${t`new chat`} ${new Date().toLocaleString('ru-RU')}`,
        defaultModel: {
          name: settings[provider]?.model || 'qwen3:0.6b',
          provider: provider || 'Ollama',
        },
        generationSettings: {
          temperature: 0.7,
          maxTokens: 2048,
        },
      })
    );

    if (createChat.fulfilled.match(result) && result.payload) {
      // Выбирает новый чат
      handleSelectChat(result.payload.id);
    }
  }, [dispatch, handleSelectChat, settings, provider, t]);

  /**
   * Обрабатывает удаление чата.
   * Удаление обрабатывается в ChatSidebar через Redux thunk.
   * Очищает активный чат если он был удален.
   */
  const handleDeleteChat = useCallback(
    (chatId: string) => {
      // Если удаляемый чат был активным, очищает выбор
      if (activeChat.chat?.id === chatId) {
        dispatch(setActiveChat({ chatId: null }));
      }
    },
    [dispatch, activeChat.chat?.id]
  );

  /**
   * Обрабатывает отправку сообщения.
   */
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !activeChat.chat || generation.isGenerating) {
      return;
    }

    const text = messageText.trim();
    setMessageText('');

    // Устанавливает состояние генерации
    dispatch(
      setGenerationState({
        isGenerating: true,
        chatId: activeChat.chat.id,
      })
    );

    try {
      // Генерация ответа через useModel в режиме чата
      await generate(
        text,
        {
          responseMode: 'stringStream',
          chatId: activeChat.chat.id,
          saveHistory: true,
        },
        {
          think: true,
          temperature: 0.7,
          max_tokens: 2048,
        }
      ).chat();

      // Обновляет чат после генерации
      dispatch(
        loadChat({
          chatId: activeChat.chat.id,
          includeMessages: true,
          messageLimit: 100,
        })
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      callANotificationWithALog(dispatch, t`Failed to send message`, error);
    } finally {
      // Сбрасывает состояние генерации
      dispatch(
        setGenerationState({
          isGenerating: false,
          chatId: null,
        })
      );
    }
  }, [
    messageText,
    activeChat.chat,
    generation.isGenerating,
    generate,
    dispatch,
    t,
  ]);

  /**
   * Обрабатывает остановку генерации.
   */
  const handleStopGeneration = useCallback(() => {
    stop();
    dispatch(
      setGenerationState({
        isGenerating: false,
        chatId: null,
      })
    );
  }, [stop, dispatch]);

  /**
   * Обрабатывает изменения в поле ввода.
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessageText(e.target.value);
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
    startTransition(() => setShowSidebar((prev) => !prev));
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
          if (!activeChat.chat) {
            throw Error;
          }

          dispatch(
            setGenerationState({
              isGenerating: true,
              chatId: activeChat.chat.id,
            })
          );

          // Использует uploadAndProcessDocument для загрузки и обработки
          const result = await ragElectron.uploadAndProcessDocument(
            file,
            activeChat.chat.id,
            {
              chunkSize: rag.chunkSize,
              embeddingModel: rag.model || undefined,
            }
          );

          if (result.success) {
            dispatch(
              addNotification({
                type: 'success',
                message: file.name + t` file is attached!`,
              })
            );
          }
        } catch (error) {
          callANotificationWithALog(dispatch, t`File processing error`, error);
        } finally {
          dispatch(
            setGenerationState({
              isGenerating: false,
              chatId: null,
            })
          );
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
    if (activeChat.chat || chatsList.loading) return null;

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
    handleLoadChats();
  }, [handleLoadChats]);

  // Обновление состояния генерации при изменении статуса useModel
  useEffect(() => {
    dispatch(
      setGenerationState({
        isGenerating: status === 'process',
        chatId: activeChat.chat?.id || null,
      })
    );
  }, [status, dispatch, activeChat.chat?.id]);

  return (
    <div className='chat'>
      {/* Боковая панель */}
      {showSidebar ? (
        <ChatSidebar
          chats={chatsList.chats}
          activeChatId={activeChat.chat?.id}
          isLoading={chatsList.loading}
          onCreateChat={handleCreateChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onRefreshChats={handleLoadChats}
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
              {activeChat.chat ? activeChat.chat.title : '...'}
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

          {activeChat.chat && (
            <ChatMessages
              messages={activeChat.chat.messages}
              isGenerating={generation.isGenerating}
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
        {activeChat.chat && (
          <div className='chat__bar'>
            <div className='chat__actions'>
              <TextareaAutosize
                className='text-heading-l chat__textarea'
                value={messageText}
                placeholder={t`ask ` + settings[provider]?.model || ''}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                disabled={generation.isGenerating}
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
                    isDisabled={!messageText.trim()}
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
