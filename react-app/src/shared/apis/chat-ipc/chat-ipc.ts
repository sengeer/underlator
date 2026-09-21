/**
 * @module ChatIpcApi
 * Тонкий фасад ChatOperationResult над BackendClient.chat.
 */

import { BackendError, getBackendClient } from '../../api';
import log from '../../lib/utils/log';
import { DEFAULT_CONFIG } from './constants/chat-ipc';
import type {
  CreateChatParams,
  ListChatsParams,
  GetChatParams,
  UpdateChatParams,
  AddMessageParams,
  DeleteChatParams,
  CreateChatResult,
  ListChatsResult,
  GetChatResult,
  UpdateChatResult,
  AddMessageResult,
  DeleteChatResult,
  ChatApiConfig,
  ChatOperationResult,
} from './types/chat-ipc';

function failResult(error: unknown): {
  success: false;
  error: string;
  status: 'error';
  timestamp: string;
} {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return {
    success: false,
    error: errorMessage,
    status: 'error',
    timestamp: new Date().toISOString(),
  };
}

function okResult<T>(data: T): ChatOperationResult<T> {
  return {
    success: true,
    data,
    status: 'success',
    timestamp: new Date().toISOString(),
  };
}

/**
 * @class ChatIpc
 * Класс-обёртка CRUD чата. Envelope для Redux slices, IPC через BackendClient.
 */
class ChatIpc {
  private config: ChatApiConfig;

  constructor(config?: Partial<ChatApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Создает новый чат.
   */
  async createChat(params: CreateChatParams): Promise<CreateChatResult> {
    try {
      log('Параметры createChat:', params);
      const data = await getBackendClient().chat.create(params);
      return okResult(data);
    } catch (error) {
      log(
        'Ошибка createChat:',
        error instanceof BackendError ? error.message : error
      );
      return failResult(error);
    }
  }

  /**
   * Получает список всех чатов.
   */
  async listChats(params: ListChatsParams = {}): Promise<ListChatsResult> {
    try {
      log('Параметры listChats:', params);
      const data = await getBackendClient().chat.list(params);
      return okResult(data);
    } catch (error) {
      log(
        'Ошибка listChats:',
        error instanceof BackendError ? error.message : error
      );
      return failResult(error);
    }
  }

  /**
   * Получает конкретный чат по ID.
   */
  async getChat(params: GetChatParams): Promise<GetChatResult> {
    try {
      log('Параметры getChat:', params);
      const data = await getBackendClient().chat.get(params);
      return okResult(data);
    } catch (error) {
      log(
        'Ошибка getChat:',
        error instanceof BackendError ? error.message : error
      );
      return failResult(error);
    }
  }

  /**
   * Обновляет существующий чат.
   */
  async updateChat(params: UpdateChatParams): Promise<UpdateChatResult> {
    try {
      log('Параметры updateChat:', params);
      const data = await getBackendClient().chat.update(params);
      return okResult(data);
    } catch (error) {
      log(
        'Ошибка updateChat:',
        error instanceof BackendError ? error.message : error
      );
      return failResult(error);
    }
  }

  /**
   * Добавляет сообщение в чат.
   */
  async addMessage(params: AddMessageParams): Promise<AddMessageResult> {
    try {
      log('Параметры addMessage:', params);
      const data = await getBackendClient().chat.addMessage(params);
      return okResult(data);
    } catch (error) {
      log(
        'Ошибка addMessage:',
        error instanceof BackendError ? error.message : error
      );
      return failResult(error);
    }
  }

  /**
   * Удаляет чат.
   */
  async deleteChat(params: DeleteChatParams): Promise<DeleteChatResult> {
    try {
      log('Параметры deleteChat:', params);
      const data = await getBackendClient().chat.delete(params);
      return {
        success: true,
        deletedChatId: data.deletedChatId,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      log(
        'Ошибка deleteChat:',
        error instanceof BackendError ? error.message : error
      );
      return failResult(error);
    }
  }

  /**
   * Обновляет конфигурацию API клиента.
   */
  updateConfig(newConfig: Partial<ChatApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Получает текущую конфигурацию.
   */
  getConfig(): ChatApiConfig {
    return { ...this.config };
  }
}

/**
 * Создает экземпляр API клиента.
 */
export function createChatIpc(config?: Partial<ChatApiConfig>): ChatIpc {
  return new ChatIpc(config);
}

const chatIpc = createChatIpc();

export default chatIpc;
