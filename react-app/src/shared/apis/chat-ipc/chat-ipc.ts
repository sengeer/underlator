/**
 * @module ChatIpcApi
 * API клиент для взаимодействия с Chat IPC.
 * Предоставляет функции для управления чатами через IPC.
 */

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
} from './types/chat-ipc';

/**
 * @class ChatIpc
 * Класс для работы с Chat Electron API.
 * Инкапсулирует Electron IPC операции для управления чатами.
 */
class СhatIpc {
  private config: ChatApiConfig;

  constructor(config?: Partial<ChatApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Проверяет доступность Electron API
    if (typeof window !== 'undefined' && window.electron) {
      log('Chat Electron API инициализирован');
    } else {
      console.warn(
        'Chat Electron API is unavailable, and some functions may not work'
      );
    }
  }

  /**
   * Создает новый чат.
   * Генерирует уникальный ID и временные метки автоматически.
   *
   * @param params - Параметры создания чата.
   * @returns Promise с результатом создания чата.
   */
  async createChat(params: CreateChatParams): Promise<CreateChatResult> {
    try {
      if (!window.electron?.chat) {
        throw new Error('Chat Electron API is unavailable');
      }

      log('Параметры createChat:', params);

      const response = await window.electron.chat.create(params);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      log('Ошибка createChat:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Получает список всех чатов.
   * Возвращает метаданные чатов для быстрого отображения.
   *
   * @param params - Параметры получения списка чатов.
   * @returns Promise со списком чатов.
   */
  async listChats(params: ListChatsParams = {}): Promise<ListChatsResult> {
    try {
      if (!window.electron?.chat) {
        throw new Error('Chat Electron API is unavailable');
      }

      log('Параметры listChats:', params);

      const response = await window.electron.chat.list(params);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      log('Ошибка listChats:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Получает конкретный чат по ID.
   * Загружает полное содержимое чата включая все сообщения.
   *
   * @param params - Параметры получения чата.
   * @returns Promise с данными чата.
   */
  async getChat(params: GetChatParams): Promise<GetChatResult> {
    try {
      if (!window.electron?.chat) {
        throw new Error('Chat Electron API is unavailable');
      }

      log('Параметры getChat:', params);

      const response = await window.electron.chat.get(params);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      log('Ошибка getChat:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Обновляет существующий чат.
   * Выполняет атомарную запись с резервным копированием.
   *
   * @param params - Параметры обновления чата.
   * @returns Promise с результатом обновления.
   */
  async updateChat(params: UpdateChatParams): Promise<UpdateChatResult> {
    try {
      if (!window.electron?.chat) {
        throw new Error('Chat Electron API is unavailable');
      }

      log('Параметры updateChat:', params);

      const response = await window.electron.chat.update(params);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      log('Ошибка updateChat:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Добавляет сообщение в чат.
   * Автоматически обновляет временные метки чата.
   *
   * @param params - Параметры добавления сообщения.
   * @returns Promise с результатом добавления сообщения.
   */
  async addMessage(params: AddMessageParams): Promise<AddMessageResult> {
    try {
      if (!window.electron?.chat) {
        throw new Error('Chat Electron API is unavailable');
      }

      log('Параметры addMessage:', params);

      const response = await window.electron.chat.addMessage(params);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      log('Ошибка addMessage:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Удаляет чат.
   * Поддерживает создание резервной копии перед удалением.
   *
   * @param params - Параметры удаления чата.
   * @returns Promise с результатом удаления.
   */
  async deleteChat(params: DeleteChatParams): Promise<DeleteChatResult> {
    try {
      if (!window.electron?.chat) {
        throw new Error('Chat Electron API is unavailable');
      }

      log('Параметры deleteChat:', params);

      const response = await window.electron.chat.delete(params);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      log('Ошибка deleteChat:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Обновляет конфигурацию API клиента.
   * Позволяет изменить настройки во время выполнения.
   *
   * @param newConfig - Новая конфигурация.
   */
  updateConfig(newConfig: Partial<ChatApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Получает текущую конфигурацию.
   * Возвращает копию текущих настроек.
   *
   * @returns Текущая конфигурация.
   */
  getConfig(): ChatApiConfig {
    return { ...this.config };
  }
}

/**
 * Создает экземпляр API клиента.
 * Фабричная функция для создания настроенного клиента.
 *
 * @param config - Конфигурация для клиента.
 * @returns Экземпляр API клиента.
 */
export function createChatIpc(config?: Partial<ChatApiConfig>): СhatIpc {
  return new СhatIpc(config);
}

/**
 * Глобальный экземпляр API клиента.
 * Используется для единообразного доступа к API во всем приложении.
 */
const chatIpc = createChatIpc();

export default chatIpc;
