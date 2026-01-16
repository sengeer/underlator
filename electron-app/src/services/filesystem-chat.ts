/**
 * @module ChatFileSystemService
 * Специализированный сервис для работы с файлами чатов.
 * Наследует функциональность от FileSystemService и добавляет чат-специфичные методы.
 */

import { FileSystemService } from './filesystem';
import type {
  FileSystemConfig,
  FileSystemOperationResult,
  FileSearchParams,
  FileSearchResult,
  FileSystemStats,
  FileOperationOptions,
} from '../types/filesystem';
import type { ChatFileStructure } from '../types/filesystem-chat';
import type { ChatData, ChatFile } from '../types/chat';
import { APP_VERSION } from '../constants/shared';

/**
 * @class ChatFileSystemService
 *
 * Специализированный сервис для работы с файлами чатов.
 * Предоставляет удобные методы для работы с чатами, используя универсальный FileSystemService.
 */
export class ChatFileSystemService {
  private fileSystemService: FileSystemService;
  private readonly chatFileType = 'chat';

  /**
   * Создает экземпляр ChatFileSystemService.
   *
   * @param config - Конфигурация сервиса.
   */
  constructor(config?: Partial<FileSystemConfig>) {
    this.fileSystemService = new FileSystemService(config);
  }

  /**
   * Инициализирует ChatFileSystemService.
   *
   * @returns Promise с результатом инициализации.
   */
  async initialize(): Promise<FileSystemOperationResult<void>> {
    return this.fileSystemService.initialize();
  }

  /**
   * Читает файл чата.
   *
   * @param fileName - Имя файла чата.
   * @param options - Опции операции.
   * @returns Promise с содержимым файла чата.
   */
  async readChatFile(
    fileName: string,
    options: FileOperationOptions = {}
  ): Promise<FileSystemOperationResult<ChatFileStructure>> {
    const result = await this.fileSystemService.readFile(
      fileName,
      this.chatFileType,
      options
    );

    if (!result.success || !result.data) {
      return result as unknown as FileSystemOperationResult<ChatFileStructure>;
    }

    const fileData = result.data;
    const chatFileStructure: ChatFileStructure = {
      version: fileData.version,
      metadata: fileData.metadata as ChatFileStructure['metadata'],
      messages: fileData.data as ChatFileStructure['messages'],
    };

    return {
      success: true,
      data: chatFileStructure,
      status: 'success',
    };
  }

  /**
   * Записывает файл чата с атомарной операцией.
   *
   * @param fileName - Имя файла чата.
   * @param chatData - Данные чата для записи.
   * @param options - Опции операции.
   * @returns Promise с результатом записи.
   */
  async writeChatFile(
    fileName: string,
    chatData: ChatFileStructure,
    options: FileOperationOptions = {}
  ): Promise<FileSystemOperationResult<void>> {
    const fileData = {
      version: chatData.version,
      metadata: chatData.metadata,
      data: chatData.messages,
    };

    return this.fileSystemService.writeFile(
      fileName,
      this.chatFileType,
      fileData,
      options
    );
  }

  /**
   * Удаляет файл чата.
   *
   * @param fileName - Имя файла чата.
   * @param options - Опции операции.
   * @returns Promise с результатом удаления.
   */
  async deleteChatFile(
    fileName: string,
    options: FileOperationOptions = {}
  ): Promise<FileSystemOperationResult<void>> {
    return this.fileSystemService.deleteFile(
      fileName,
      this.chatFileType,
      options
    );
  }

  /**
   * Получает список файлов чатов.
   *
   * @param searchParams - Параметры поиска.
   * @returns Promise со списком файлов чатов.
   */
  async listChatFiles(
    searchParams: FileSearchParams = {}
  ): Promise<FileSystemOperationResult<FileSearchResult>> {
    return this.fileSystemService.listFiles(this.chatFileType, searchParams);
  }

  /**
   * Получает статистику файловой системы для чатов.
   *
   * @returns Promise со статистикой.
   */
  async getFileSystemStats(): Promise<
    FileSystemOperationResult<FileSystemStats>
  > {
    return this.fileSystemService.getFileSystemStats(this.chatFileType);
  }

  /**
   * Преобразует структуру файла чата в объект ChatData.
   *
   * @param chatFile - Структура файла чата.
   * @returns Объект чата.
   */
  convertFileToChatData(chatFile: ChatFileStructure): ChatData {
    return {
      id: chatFile.metadata.id,
      title: chatFile.metadata.title,
      messages: chatFile.messages.map(msg => {
        // Извлекает модель и контекст из метаданных сообщения
        const messageModel = msg.metadata?.['model'] as
          | { name: string; version?: string; provider?: string }
          | undefined;
        const messageContext = msg.metadata?.['context'] as
          | { previousMessages?: string[]; metadata?: Record<string, unknown> }
          | undefined;

        // Создает копию метаданных без model и context
        const messageMetadata = { ...msg.metadata };
        if (messageMetadata) {
          delete messageMetadata['model'];
          delete messageMetadata['context'];
        }

        const result: ChatData['messages'][0] = {
          id: msg.id,
          role: msg.type as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.timestamp,
        };

        // Добавляет model только если он существует
        if (messageModel) {
          result.model = messageModel;
        }

        // Добавляет context только если он существует
        if (messageContext) {
          result.context = messageContext;
        }

        // Добавляет metadata только если он существует
        if (messageMetadata && Object.keys(messageMetadata).length > 0) {
          result.metadata = messageMetadata;
        }

        return result;
      }),
      createdAt: chatFile.metadata.createdAt,
      updatedAt: chatFile.metadata.updatedAt,
      defaultModel: (() => {
        const model: ChatData['defaultModel'] = {
          name: chatFile.metadata.settings.model,
          provider: chatFile.metadata.settings.provider,
        };

        const version = chatFile.metadata.settings.parameters?.['version'] as
          | string
          | undefined;
        if (version) {
          model.version = version;
        }

        return model;
      })(),
      context: (() => {
        const context: Partial<ChatData['context']> = {};

        const systemPrompt = chatFile.metadata.settings.parameters?.[
          'systemPrompt'
        ] as string | undefined;
        if (systemPrompt) {
          context.systemPrompt = systemPrompt;
        }

        const generationSettings = chatFile.metadata.settings.parameters?.[
          'generationSettings'
        ] as
          | {
              temperature?: number;
              maxTokens?: number;
              parameters?: Record<string, unknown>;
            }
          | undefined;
        if (generationSettings) {
          context.generationSettings = generationSettings;
        }

        const metadata = chatFile.metadata.settings.parameters;
        if (metadata && Object.keys(metadata).length > 0) {
          context.metadata = metadata;
        }

        return Object.keys(context).length > 0 ? context : undefined;
      })(),
      metadata:
        chatFile.metadata.settings.parameters &&
        Object.keys(chatFile.metadata.settings.parameters).length > 0
          ? chatFile.metadata.settings.parameters
          : undefined,
    };
  }

  /**
   * Преобразует структуру файла чата в объект ChatFile для списка.
   *
   * @param chatFile - Структура файла чата.
   * @param fileInfo - Информация о файле.
   * @returns Объект чата для списка.
   */
  convertFileToChatFile(
    chatFile: ChatFileStructure,
    fileInfo: { size: number; isLocked: boolean }
  ): ChatFile {
    const lastMessage =
      chatFile.messages.length > 0
        ? chatFile.messages[chatFile.messages.length - 1]
        : undefined;

    return {
      id: chatFile.metadata.id,
      title: chatFile.metadata.title,
      messageCount: chatFile.messages.length,
      createdAt: chatFile.metadata.createdAt,
      updatedAt: chatFile.metadata.updatedAt,
      defaultModel: (() => {
        const model: ChatData['defaultModel'] = {
          name: chatFile.metadata.settings.model,
          provider: chatFile.metadata.settings.provider,
        };

        const version = chatFile.metadata.settings.parameters?.['version'] as
          | string
          | undefined;
        if (version) {
          model.version = version;
        }

        return model;
      })(),
      lastMessage: lastMessage
        ? {
            role: lastMessage.type as 'user' | 'assistant' | 'system',
            content: lastMessage.content,
            timestamp: lastMessage.timestamp,
          }
        : undefined,
      fileSize: fileInfo.size,
      isLocked: fileInfo.isLocked,
      metadata:
        chatFile.metadata.settings.parameters &&
        Object.keys(chatFile.metadata.settings.parameters).length > 0
          ? chatFile.metadata.settings.parameters
          : undefined,
    };
  }

  /**
   * Получает список чатов в формате ChatFile.
   *
   * @param searchParams - Параметры поиска.
   * @returns Promise со списком чатов.
   */
  async getChatFiles(
    searchParams: FileSearchParams = {}
  ): Promise<FileSystemOperationResult<ChatFile[]>> {
    const listResult = await this.listChatFiles(searchParams);
    if (!listResult.success || !listResult.data) {
      return {
        success: false,
        error: listResult.error,
        status: 'error',
      };
    }

    const chatFiles: ChatFile[] = [];

    // Преобразует информацию о файлах в объекты чатов
    for (const fileInfo of listResult.data.files) {
      try {
        // Читает файл чата для получения метаданных
        const readResult = await this.readChatFile(fileInfo.fileName);
        if (readResult.success && readResult.data) {
          const chatFile = this.convertFileToChatFile(readResult.data, {
            size: fileInfo.size,
            isLocked: fileInfo.isLocked,
          });
          chatFiles.push(chatFile);
        }
      } catch (error) {
        console.warn(
          `⚠️ Failed to read chat file ${fileInfo.fileName}:`,
          error
        );
        // Продолжает обработку других файлов
      }
    }

    return {
      success: true,
      data: chatFiles,
      status: 'success',
    };
  }

  /**
   * Получает чат по ID.
   *
   * @param chatId - ID чата.
   * @param options - Опции операции.
   * @returns Promise с данными чата.
   */
  async getChatById(
    chatId: string,
    options: FileOperationOptions = {}
  ): Promise<FileSystemOperationResult<ChatData>> {
    const fileName = this.getChatFileName(chatId);
    const readResult = await this.readChatFile(fileName, options);

    if (!readResult.success || !readResult.data) {
      return {
        success: false,
        error: readResult.error,
        status: 'error',
      };
    }

    const chatData = this.convertFileToChatData(readResult.data);
    return {
      success: true,
      data: chatData,
      status: 'success',
    };
  }

  /**
   * Сохраняет чат.
   *
   * @param chatData - Данные чата для сохранения.
   * @param options - Опции операции.
   * @returns Promise с результатом сохранения.
   */
  async saveChat(
    chatData: ChatData,
    options: FileOperationOptions = {}
  ): Promise<FileSystemOperationResult<void>> {
    const fileName = this.getChatFileName(chatData.id);
    const chatFile = this.convertChatDataToFile(chatData);

    return this.writeChatFile(fileName, chatFile, options);
  }

  /**
   * Преобразует объект ChatData в структуру файла чата.
   *
   * @param chatData - Данные чата.
   * @returns Структура файла чата.
   */
  convertChatDataToFile(chatData: ChatData): ChatFileStructure {
    return {
      version: APP_VERSION,
      metadata: {
        id: chatData.id,
        title: chatData.title,
        createdAt: chatData.createdAt,
        updatedAt: chatData.updatedAt,
        settings: {
          model: chatData.defaultModel.name,
          provider: chatData.defaultModel.provider || 'ollama',
          parameters: {
            version: chatData.defaultModel.version,
            systemPrompt: chatData.context?.systemPrompt,
            generationSettings: chatData.context?.generationSettings,
            ...chatData.metadata,
          },
        },
      },
      messages: chatData.messages.map(msg => ({
        id: msg.id,
        type: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: {
          model: msg.model,
          context: msg.context,
          ...msg.metadata,
        },
      })),
    };
  }

  /**
   * Определяет имя файла чата по его ID.
   *
   * @param chatId - ID чата.
   * @returns Имя файла чата.
   */
  private getChatFileName(chatId: string): string {
    return `${chatId}.chat.json`;
  }

  /**
   * Получает текущую конфигурацию сервиса.
   *
   * @returns Текущая конфигурация.
   */
  getConfig(): FileSystemConfig {
    return this.fileSystemService.getConfig();
  }

  /**
   * Обновляет конфигурацию сервиса.
   *
   * @param newConfig - Новая конфигурация.
   */
  updateConfig(newConfig: Partial<FileSystemConfig>): void {
    this.fileSystemService.updateConfig(newConfig);
  }

  /**
   * Проверяет статус инициализации сервиса.
   *
   * @returns true если сервис инициализирован.
   */
  isServiceInitialized(): boolean {
    return this.fileSystemService.isServiceInitialized();
  }
}

/**
 * Создает экземпляр ChatFileSystemService с настройками по умолчанию.
 *
 * @param config - Опциональная конфигурация.
 * @returns Экземпляр ChatFileSystemService.
 */
export function createChatFileSystemService(
  config?: Partial<FileSystemConfig>
): ChatFileSystemService {
  return new ChatFileSystemService(config);
}
