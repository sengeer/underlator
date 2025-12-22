/**
 * @module ChatIpcSliceTypes
 * Типы для Redux slice управления чатами.
 * Определяет интерфейсы для состояния чатов и операций с ними.
 */

import type {
  ChatData,
  ChatFile,
  ChatMessage,
  ListChatsParams,
  CreateChatParams,
  GetChatParams,
  UpdateChatParams,
  DeleteChatParams,
  AddMessageParams,
} from '../../../apis/chat-ipc/types/chat-ipc';

/**
 * Состояние загрузки списка чатов.
 * Отслеживает процесс получения списка чатов с метаданными.
 */
export interface ChatsListState {
  /** Список чатов с метаданными */
  chats: ChatFile[];
  /** Флаг загрузки списка чатов */
  loading: boolean;
  /** Ошибка при загрузке списка */
  error: string | null;
  /** Время последнего обновления списка */
  lastUpdated: number | null;
  /** Общее количество чатов */
  totalCount: number;
}

/**
 * Состояние активного чата.
 * Хранит полную информацию о текущем открытом чате.
 */
export interface ActiveChatState {
  /** Полные данные активного чата */
  chat: ChatData | null;
  /** Флаг загрузки чата */
  loading: boolean;
  /** Ошибка при загрузке чата */
  error: string | null;
  /** Время последнего обновления чата */
  lastUpdated: number | null;
}

/**
 * Состояние операций с чатами.
 * Отслеживает процессы создания, обновления и удаления чатов.
 */
export interface ChatOperationsState {
  /** Флаг создания нового чата */
  creating: boolean;
  /** Флаг обновления чата */
  updating: boolean;
  /** Список ID чатов в процессе удаления */
  deleting: string[];
  /** Ошибки операций по ID чата */
  errors: Record<string, string>;
}

/**
 * Состояние генерации ответа.
 * Управляет процессом генерации ответа модели в активном чате.
 */
export interface GenerationState {
  /** Флаг активной генерации ответа */
  isGenerating: boolean;
  /** ID чата, в котором происходит генерация */
  activeChatId: string | null;
  /** Текущий текст генерируемого ответа */
  currentText: string;
}

/**
 * Общее состояние управления чатами.
 * Объединяет все подсостояния для централизованного управления.
 */
export interface ChatState {
  /** Состояние списка чатов */
  chatsList: ChatsListState;
  /** Состояние активного чата */
  activeChat: ActiveChatState;
  /** Состояние операций с чатами */
  operations: ChatOperationsState;
  /** Состояние генерации ответа */
  generation: GenerationState;
}

/**
 * Параметры для загрузки списка чатов.
 * Расширяет базовые параметры ListChatsParams.
 */
export interface LoadChatsParams extends ListChatsParams {
  /** Принудительное обновление списка */
  forceRefresh?: boolean;
}

/**
 * Параметры для создания чата.
 * Соответствует CreateChatParams из IPC API.
 */
export type CreateChatSliceParams = CreateChatParams;

/**
 * Параметры для загрузки чата.
 * Соответствует GetChatParams из IPC API.
 */
export type LoadChatSliceParams = GetChatParams;

/**
 * Параметры для обновления чата.
 * Соответствует UpdateChatParams из IPC API.
 */
export type UpdateChatSliceParams = UpdateChatParams;

/**
 * Параметры для удаления чата.
 * Соответствует DeleteChatParams из IPC API.
 */
export type DeleteChatSliceParams = DeleteChatParams;

/**
 * Параметры для добавления сообщения.
 * Соответствует AddMessageParams из IPC API.
 */
export type AddMessageSliceParams = AddMessageParams;

/**
 * Параметры для обновления сообщения в чате.
 * Используется для обновления существующего сообщения.
 */
export interface UpdateMessageParams {
  /** ID чата */
  chatId: string;
  /** ID сообщения для обновления */
  messageId: string;
  /** Новое содержимое сообщения */
  content: string;
}

/**
 * Параметры для установки активного чата.
 * Используется для переключения между чатами.
 */
export interface SetActiveChatParams {
  /** ID чата для активации */
  chatId: string | null;
  /** Загружать ли полное содержимое чата */
  loadFullContent?: boolean;
}
