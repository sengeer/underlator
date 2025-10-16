/**
 * @module ChatIpcApi
 * API клиент для взаимодействия с Chat IPC.
 * Предоставляет функции для управления чатами через IPC.
 */

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
 * Конфигурация по умолчанию для API клиента.
 * Базовые настройки для работы с Chat Electron API.
 */
const DEFAULT_CONFIG: ChatApiConfig = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: false,
};

/**
 * @class Electron
 * Класс для работы с Chat Electron API.
 * Инкапсулирует Electron IPC операции для управления чатами.
 */
export class Electron {
  private config: ChatApiConfig;

  constructor(config?: Partial<ChatApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Проверяет доступность Electron API
    if (typeof window !== 'undefined' && window.electron) {
      this.log('Chat Electron API initialized');
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

      this.log('Creating new chat:', params.title);

      const response = await window.electron.chat.create(params);

      if (response.success && response.data) {
        this.log('Chat created successfully:', response.data.id);
      }

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.log('Error creating chat:', errorMessage);

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

      this.log('Fetching chat list');

      const response = await window.electron.chat.list(params);

      if (response.success && response.data) {
        this.log(
          `Found ${response.data.chats.length} chats (total: ${response.data.totalCount})`
        );
      }

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.log('Error fetching chat list:', errorMessage);

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

      this.log('Fetching chat:', params.chatId);

      const response = await window.electron.chat.get(params);

      if (response.success && response.data) {
        this.log(
          `Chat loaded: ${response.data.title} (${response.data.messages.length} messages)`
        );
      }

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.log('Error fetching chat:', errorMessage);

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

      this.log('Updating chat:', params.chatId);

      const response = await window.electron.chat.update(params);

      if (response.success && response.data) {
        this.log('Chat updated successfully:', response.data.id);
      }

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.log('Error updating chat:', errorMessage);

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

      this.log('Adding message to chat:', params.chatId);

      const response = await window.electron.chat.addMessage(params);

      if (response.success && response.data) {
        this.log(
          `Message added: ${params.role} message in chat ${params.chatId}`
        );
      }

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.log('Error adding message:', errorMessage);

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

      this.log('Deleting chat:', params.chatId);

      const response = await window.electron.chat.delete(params);

      if (response.success && response.data) {
        this.log(
          `Chat deleted: ${response.data.deletedChatId}${
            response.data.backupCreated ? ' (backup created)' : ''
          }`
        );
      }

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.log('Error deleting chat:', errorMessage);

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

  /**
   * Логирует сообщения если включено логирование.
   * Используется для отладки и мониторинга операций.
   *
   * @param message - Сообщение для логирования.
   * @param data - Дополнительные данные.
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[Chat API] ${message}`, data || '');
    }
  }
}

/**
 * Создает экземпляр API клиента.
 * Фабричная функция для создания настроенного клиента.
 *
 * @param config - Конфигурация для клиента.
 * @returns Экземпляр API клиента.
 */
export function createElectron(config?: Partial<ChatApiConfig>): Electron {
  return new Electron(config);
}

/**
 * Глобальный экземпляр API клиента.
 * Используется для единообразного доступа к API во всем приложении.
 */
export const electron = createElectron();

export default electron;
