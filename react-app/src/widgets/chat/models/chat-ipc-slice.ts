/**
 * @module ChatIpcSlice
 * Redux slice для управления Chat IPC в Chat виджете.
 * Обеспечивает управление чатами, сообщениями и генерацией ответов.
 */

import { i18n } from '@lingui/core';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { electron } from '../../../shared/apis/chat-ipc';
import type { ChatMessage } from '../../../shared/apis/chat-ipc/types/chat-ipc';
import callANotificationWithALog from '../../../shared/lib/utils/call-a-notification-with-a-log/call-a-notification-with-a-log';
import { addNotification } from '../../../shared/models/notifications-slice';
import type {
  ChatState,
  ChatsListState,
  ActiveChatState,
  ChatOperationsState,
  GenerationState,
  LoadChatsParams,
  CreateChatSliceParams,
  LoadChatSliceParams,
  UpdateChatSliceParams,
  DeleteChatSliceParams,
  AddMessageSliceParams,
  UpdateMessageParams,
  SetActiveChatParams,
} from '../types/chat-ipc-slice';

/**
 * Начальное состояние списка чатов.
 * Состояние с настройками по умолчанию.
 */
const initialChatsListState: ChatsListState = {
  chats: [],
  loading: false,
  error: null,
  lastUpdated: null,
  totalCount: 0,
};

/**
 * Начальное состояние активного чата.
 * Состояние с настройками по умолчанию.
 */
const initialActiveChatState: ActiveChatState = {
  chat: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

/**
 * Начальное состояние операций с чатами.
 * Состояние с настройками по умолчанию.
 */
const initialOperationsState: ChatOperationsState = {
  creating: false,
  updating: false,
  deleting: [],
  errors: {},
};

/**
 * Начальное состояние генерации ответа.
 * Состояние с настройками по умолчанию.
 */
const initialGenerationState: GenerationState = {
  isGenerating: false,
  activeChatId: null,
  currentText: '',
};

/**
 * Начальное состояние управления чатами.
 * Объединяет все подсостояния в единое состояние.
 */
const initialState: ChatState = {
  chatsList: initialChatsListState,
  activeChat: initialActiveChatState,
  operations: initialOperationsState,
  generation: initialGenerationState,
};

/**
 * Async thunk для загрузки списка чатов.
 * Загружает список чатов с метаданными с поддержкой кэширования и принудительного обновления.
 */
export const loadChats = createAsyncThunk(
  'chat/loadChats',
  async (params: LoadChatsParams = {}, { rejectWithValue, dispatch }) => {
    try {
      // Если не требуется принудительное обновление и есть кэш, возвращает кэшированные данные
      if (!params.forceRefresh) {
        // Кэширование обрабатывается на уровне компонента
      }

      const result = await electron.listChats(params);

      if (!result.success) {
        const errMsg = 'Error getting the chats list';

        callANotificationWithALog(
          dispatch,
          i18n._('Error getting the chats list'),
          errMsg
        );

        return rejectWithValue(result.error || errMsg);
      }

      return result.data;
    } catch (error) {
      const errMsg = `Error getting the chats list: ${(error as Error).message}`;

      callANotificationWithALog(
        dispatch,
        i18n._('Error getting the chats list'),
        errMsg
      );

      return rejectWithValue(errMsg);
    }
  }
);

/**
 * Async thunk для создания нового чата.
 * Создает новый чат с автоматической генерацией ID и временных меток.
 */
export const createChat = createAsyncThunk(
  'chat/createChat',
  async (params: CreateChatSliceParams, { rejectWithValue, dispatch }) => {
    try {
      const result = await electron.createChat(params);

      if (!result.success) {
        const errMsg = 'Error creating chat';

        callANotificationWithALog(
          dispatch,
          i18n._('Error creating chat'),
          errMsg
        );

        return rejectWithValue(result.error || errMsg);
      }

      dispatch(
        addNotification({
          type: 'success',
          message: i18n._('Chat created successfully'),
        })
      );

      // Обновляет список чатов после создания
      dispatch(loadChats({ forceRefresh: true }));

      return result.data;
    } catch (error) {
      const errMsg = `Error creating chat: ${(error as Error).message}`;

      callANotificationWithALog(
        dispatch,
        i18n._('Error creating chat'),
        errMsg
      );

      return rejectWithValue(errMsg);
    }
  }
);

/**
 * Async thunk для загрузки конкретного чата.
 * Загружает полное содержимое чата включая все сообщения.
 */
export const loadChat = createAsyncThunk(
  'chat/loadChat',
  async (params: LoadChatSliceParams, { rejectWithValue, dispatch }) => {
    try {
      const result = await electron.getChat(params);

      if (!result.success) {
        const errMsg = 'Error getting chat';

        callANotificationWithALog(
          dispatch,
          i18n._('Error getting chat'),
          errMsg
        );

        return rejectWithValue(result.error || errMsg);
      }

      return result.data;
    } catch (error) {
      const errMsg = `Error getting chat: ${(error as Error).message}`;

      callANotificationWithALog(dispatch, i18n._('Error getting chat'), errMsg);

      return rejectWithValue(errMsg);
    }
  }
);

/**
 * Async thunk для обновления чата.
 * Обновляет чат с атомарной записью и резервным копированием.
 */
export const updateChat = createAsyncThunk(
  'chat/updateChat',
  async (params: UpdateChatSliceParams, { rejectWithValue, dispatch }) => {
    try {
      const result = await electron.updateChat(params);

      if (!result.success) {
        const errMsg = 'Error updating chat';

        callANotificationWithALog(
          dispatch,
          i18n._('Error updating chat'),
          errMsg
        );

        return rejectWithValue(result.error || errMsg);
      }

      // Если обновленный чат является активным, обновляет его в состоянии
      dispatch(
        addNotification({
          type: 'success',
          message: i18n._('Chat updated successfully'),
        })
      );

      return result.data;
    } catch (error) {
      const errMsg = `Error updating chat: ${(error as Error).message}`;

      callANotificationWithALog(
        dispatch,
        i18n._('Error updating chat'),
        errMsg
      );

      return rejectWithValue(errMsg);
    }
  }
);

/**
 * Async thunk для удаления чата.
 * Удаляет чат с возможностью создания резервной копии.
 */
export const deleteChat = createAsyncThunk(
  'chat/deleteChat',
  async (params: DeleteChatSliceParams, { rejectWithValue, dispatch }) => {
    try {
      const result = await electron.deleteChat(params);

      if (!result.success) {
        const errMsg = 'Error deleting chat';

        callANotificationWithALog(
          dispatch,
          i18n._('Error deleting chat'),
          errMsg
        );

        return rejectWithValue(result.error || errMsg);
      }

      dispatch(
        addNotification({
          type: 'success',
          message: i18n._('Chat deleted successfully'),
        })
      );

      // Обновляет список чатов после удаления
      dispatch(loadChats({ forceRefresh: true }));

      return {
        chatId: params.chatId,
        deletedChatId: (result.data as unknown as { deletedChatId?: string })
          ?.deletedChatId,
      };
    } catch (error) {
      const errMsg = `Error deleting chat: ${(error as Error).message}`;

      callANotificationWithALog(
        dispatch,
        i18n._('Error deleting chat'),
        errMsg
      );

      return rejectWithValue(errMsg);
    }
  }
);

/**
 * Async thunk для добавления сообщения в чат.
 * Добавляет новое сообщение с автоматическим обновлением временных меток.
 */
export const addMessage = createAsyncThunk(
  'chat/addMessage',
  async (params: AddMessageSliceParams, { rejectWithValue, dispatch }) => {
    try {
      const result = await electron.addMessage(params);

      if (!result.success) {
        const errMsg = 'Error adding message';

        callANotificationWithALog(
          dispatch,
          i18n._('Error adding message'),
          errMsg
        );

        return rejectWithValue(result.error || errMsg);
      }

      return result.data;
    } catch (error) {
      const errMsg = `Error adding message: ${(error as Error).message}`;

      callANotificationWithALog(
        dispatch,
        i18n._('Error adding message'),
        errMsg
      );

      return rejectWithValue(errMsg);
    }
  }
);

/**
 * Redux slice для управления чатами.
 * Содержит reducers и actions для всех операций с чатами.
 */
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    /**
     * Устанавливает активный чат.
     * Обновляет активный чат без загрузки полного содержимого.
     */
    setActiveChat: (state, action: PayloadAction<SetActiveChatParams>) => {
      const { chatId, loadFullContent } = action.payload;

      if (chatId === null) {
        state.activeChat.chat = null;
        state.activeChat.error = null;
        return;
      }

      // Если требуется загрузка полного содержимого, это обрабатывается через async thunk
      // Здесь только обновляется ID активного чата
      if (state.activeChat.chat?.id !== chatId) {
        state.activeChat.chat = null;
        state.activeChat.loading = loadFullContent || false;
      }
    },

    /**
     * Добавляет сообщение в активный чат локально.
     * Используется для оптимистичного обновления UI до получения ответа от сервера.
     */
    addMessageLocally: (
      state,
      action: PayloadAction<{ chatId: string; message: ChatMessage }>
    ) => {
      const { chatId, message } = action.payload;

      if (state.activeChat.chat?.id === chatId) {
        state.activeChat.chat.messages.push(message);
        state.activeChat.chat.updatedAt = new Date().toISOString();
      }
    },

    /**
     * Обновляет сообщение в активном чате.
     * Используется для обновления существующего сообщения (например, при стриминге).
     */
    updateMessage: (
      state,
      action: PayloadAction<UpdateMessageParams & { content: string }>
    ) => {
      const { chatId, messageId, content } = action.payload;

      if (state.activeChat.chat?.id === chatId) {
        const message = state.activeChat.chat.messages.find(
          (msg) => msg.id === messageId
        );

        if (message) {
          message.content = content;
          state.activeChat.chat.updatedAt = new Date().toISOString();
        }
      }
    },

    /**
     * Устанавливает состояние генерации ответа.
     * Управляет флагом генерации и текущим текстом ответа.
     */
    setGenerationState: (
      state,
      action: PayloadAction<{
        isGenerating: boolean;
        chatId?: string | null;
        currentText?: string;
      }>
    ) => {
      const { isGenerating, chatId, currentText } = action.payload;

      state.generation.isGenerating = isGenerating;
      state.generation.activeChatId = chatId ?? state.generation.activeChatId;
      state.generation.currentText =
        currentText ?? state.generation.currentText;

      // Очищает текущий текст при завершении генерации
      if (!isGenerating) {
        state.generation.currentText = '';
      }
    },

    /**
     * Обновляет текущий текст генерируемого ответа.
     * Используется при стриминге ответа от модели.
     */
    updateGenerationText: (
      state,
      action: PayloadAction<{ chatId: string; text: string }>
    ) => {
      const { chatId, text } = action.payload;

      if (state.generation.activeChatId === chatId) {
        state.generation.currentText = text;
      }
    },

    /**
     * Очищает ошибки операций.
     * Удаляет все ошибки операций с чатами.
     */
    clearOperationErrors: (state) => {
      state.operations.errors = {};
    },

    /**
     * Очищает ошибку конкретной операции.
     * Удаляет ошибку для указанного чата.
     */
    clearChatError: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      delete state.operations.errors[chatId];
    },

    /**
     * Сбрасывает состояние генерации.
     * Очищает все данные генерации ответа.
     */
    resetGeneration: (state) => {
      state.generation = initialGenerationState;
    },

    /**
     * Сбрасывает все состояние.
     * Возвращает состояние к начальному.
     */
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    // Обработка loadChats
    builder
      .addCase(loadChats.pending, (state) => {
        state.chatsList.loading = true;
        state.chatsList.error = null;
      })
      .addCase(loadChats.fulfilled, (state, action) => {
        state.chatsList.loading = false;
        if (action.payload) {
          state.chatsList.chats = action.payload.chats;
          state.chatsList.totalCount = action.payload.totalCount;
        }
        state.chatsList.lastUpdated = Date.now();
        state.chatsList.error = null;
      })
      .addCase(loadChats.rejected, (state, action) => {
        state.chatsList.loading = false;
        state.chatsList.error = action.payload as string;
      });

    // Обработка createChat
    builder
      .addCase(createChat.pending, (state) => {
        state.operations.creating = true;
        state.operations.errors = {};
      })
      .addCase(createChat.fulfilled, (state, action) => {
        state.operations.creating = false;
        if (action.payload) {
          // Добавляет новый чат в список если его там еще нет
          const existingChat = state.chatsList.chats.find(
            (chat) => chat.id === action.payload!.id
          );
          if (!existingChat) {
            const payload = action.payload;
            // Преобразует ChatData в ChatFile для списка
            state.chatsList.chats.unshift({
              id: payload.id,
              title: payload.title,
              messageCount: payload.messages.length,
              createdAt: payload.createdAt,
              updatedAt: payload.updatedAt,
              defaultModel: payload.defaultModel,
              lastMessage:
                payload.messages.length > 0
                  ? {
                      role: payload.messages[payload.messages.length - 1].role,
                      content:
                        payload.messages[payload.messages.length - 1].content,
                      timestamp:
                        payload.messages[payload.messages.length - 1].timestamp,
                    }
                  : undefined,
            });
            state.chatsList.totalCount += 1;
          }
        }
      })
      .addCase(createChat.rejected, (state, action) => {
        state.operations.creating = false;
        state.operations.errors['create'] = action.payload as string;
      });

    // Обработка loadChat
    builder
      .addCase(loadChat.pending, (state) => {
        state.activeChat.loading = true;
        state.activeChat.error = null;
      })
      .addCase(loadChat.fulfilled, (state, action) => {
        state.activeChat.loading = false;
        state.activeChat.chat = action.payload || null;
        state.activeChat.lastUpdated = Date.now();
        state.activeChat.error = null;
      })
      .addCase(loadChat.rejected, (state, action) => {
        state.activeChat.loading = false;
        state.activeChat.error = action.payload as string;
      });

    // Обработка updateChat
    builder
      .addCase(updateChat.pending, (state) => {
        state.operations.updating = true;
      })
      .addCase(updateChat.fulfilled, (state, action) => {
        state.operations.updating = false;
        if (action.payload) {
          const payload = action.payload;
          // Обновляет активный чат если он был обновлен
          if (state.activeChat.chat?.id === payload.id) {
            state.activeChat.chat = payload;
            state.activeChat.lastUpdated = Date.now();
          }

          // Обновляет чат в списке
          const chatIndex = state.chatsList.chats.findIndex(
            (chat) => chat.id === payload.id
          );
          if (chatIndex !== -1) {
            state.chatsList.chats[chatIndex] = {
              ...state.chatsList.chats[chatIndex],
              title: payload.title,
              updatedAt: payload.updatedAt,
              messageCount: payload.messages.length,
              lastMessage:
                payload.messages.length > 0
                  ? {
                      role: payload.messages[payload.messages.length - 1].role,
                      content:
                        payload.messages[payload.messages.length - 1].content,
                      timestamp:
                        payload.messages[payload.messages.length - 1].timestamp,
                    }
                  : undefined,
            };
          }
        }
      })
      .addCase(updateChat.rejected, (state, action) => {
        state.operations.updating = false;
        state.operations.errors['update'] = action.payload as string;
      });

    // Обработка deleteChat
    builder
      .addCase(deleteChat.pending, (state, action) => {
        const chatId = action.meta.arg.chatId;
        if (!state.operations.deleting.includes(chatId)) {
          state.operations.deleting.push(chatId);
        }
      })
      .addCase(deleteChat.fulfilled, (state, action) => {
        const { chatId } = action.payload;

        // Удаляет чат из списка
        state.chatsList.chats = state.chatsList.chats.filter(
          (chat) => chat.id !== chatId
        );
        state.chatsList.totalCount = Math.max(
          0,
          state.chatsList.totalCount - 1
        );

        // Удаляет чат из списка удаляемых
        state.operations.deleting = state.operations.deleting.filter(
          (id) => id !== chatId
        );

        // Если удаляемый чат был активным, очищает активный чат
        if (state.activeChat.chat?.id === chatId) {
          state.activeChat.chat = null;
          state.activeChat.error = null;
        }

        // Очищает ошибки для этого чата
        delete state.operations.errors[chatId];
      })
      .addCase(deleteChat.rejected, (state, action) => {
        const chatId = action.meta.arg.chatId;

        // Удаляет чат из списка удаляемых
        state.operations.deleting = state.operations.deleting.filter(
          (id) => id !== chatId
        );

        state.operations.errors[chatId] = action.payload as string;
      });

    // Обработка addMessage
    builder
      .addCase(addMessage.fulfilled, (state, action) => {
        if (action.payload?.updatedChat) {
          const updatedChat = action.payload.updatedChat;
          // Обновляет активный чат если сообщение было добавлено в него
          if (state.activeChat.chat?.id === updatedChat.id) {
            state.activeChat.chat = updatedChat;
            state.activeChat.lastUpdated = Date.now();
          }

          // Обновляет чат в списке
          const chatIndex = state.chatsList.chats.findIndex(
            (chat) => chat.id === updatedChat.id
          );
          if (chatIndex !== -1) {
            state.chatsList.chats[chatIndex] = {
              ...state.chatsList.chats[chatIndex],
              updatedAt: updatedChat.updatedAt,
              messageCount: updatedChat.messages.length,
              lastMessage:
                updatedChat.messages.length > 0
                  ? {
                      role: updatedChat.messages[
                        updatedChat.messages.length - 1
                      ].role,
                      content:
                        updatedChat.messages[updatedChat.messages.length - 1]
                          .content,
                      timestamp:
                        updatedChat.messages[updatedChat.messages.length - 1]
                          .timestamp,
                    }
                  : undefined,
            };
          }
        }
      })
      .addCase(addMessage.rejected, (state, action) => {
        const chatId = action.meta.arg.chatId;
        state.operations.errors[chatId] = action.payload as string;
      });
  },
});

// Экспорт actions
export const {
  setActiveChat,
  addMessageLocally,
  updateMessage,
  setGenerationState,
  updateGenerationText,
  clearOperationErrors,
  clearChatError,
  resetGeneration,
  resetState,
} = chatSlice.actions;

// Экспорт reducer
export default chatSlice.reducer;

// Селекторы для упрощения доступа к состоянию
export const selectChatState = (state: { chat: ChatState }) => state.chat;

export const selectChatsList = (state: { chat: ChatState }) =>
  state.chat.chatsList;

export const selectActiveChat = (state: { chat: ChatState }) =>
  state.chat.activeChat;

export const selectChatOperations = (state: { chat: ChatState }) =>
  state.chat.operations;

export const selectGeneration = (state: { chat: ChatState }) =>
  state.chat.generation;

export const selectIsChatDeleting =
  (chatId: string) => (state: { chat: ChatState }) =>
    state.chat.operations.deleting.includes(chatId);

export const selectChatError =
  (chatId: string) => (state: { chat: ChatState }) =>
    state.chat.operations.errors[chatId];
