/**
 * @module ChatHandlers
 * IPC обработчики для работы с чатами через файловую систему.
 * Реализует CRUD операции с валидацией, обработкой ошибок и логированием.
 */

import { ipcMain } from 'electron';
import { IpcHandler } from './ipc-handlers';
import { FileSystemService } from '../../services/filesystem';
import type {
  CreateChatRequest,
  GetChatRequest,
  UpdateChatRequest,
  DeleteChatRequest,
  ListChatsRequest,
  AddMessageRequest,
  ChatOperationResult,
  CreateChatResult,
  GetChatResult,
  UpdateChatResult,
  DeleteChatResult,
  ListChatsResult,
  AddMessageResult,
  ChatData,
  ChatMessage,
  ChatFile,
} from '../../types/chat';
import type { ChatFileStructure } from '../../types/filesystem';

/**
 * @class ChatHandlers
 *
 * Класс для управления IPC обработчиками чатов.
 * Обеспечивает безопасное взаимодействие между frontend и файловой системой.
 */
export class ChatHandlers {
  private fileSystemService: FileSystemService;

  /**
   * Создает экземпляр ChatHandlers.
   *
   * @param fileSystemService - Сервис для работы с файловой системой.
   */
  constructor(fileSystemService: FileSystemService) {
    this.fileSystemService = fileSystemService;
  }

  /**
   * Регистрирует все IPC обработчики для чатов.
   * Настраивает обработчики для всех CRUD операций с чатами.
   */
  registerHandlers(): void {
    console.log('🔧 Registering chat IPC handlers...');

    // Обработчик создания нового чата
    ipcMain.handle(
      'chat:create',
      IpcHandler.createHandlerWrapper(
        async (request: CreateChatRequest): Promise<ChatData> => {
          const result = await this.handleCreateChat(request);
          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to create chat');
          }
          return result.data;
        },
        'chat:create'
      )
    );

    // Обработчик получения чата по ID
    ipcMain.handle(
      'chat:get',
      IpcHandler.createHandlerWrapper(
        async (request: GetChatRequest): Promise<ChatData> => {
          const result = await this.handleGetChat(request);
          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to get chat');
          }
          return result.data;
        },
        'chat:get'
      )
    );

    // Обработчик обновления чата
    ipcMain.handle(
      'chat:update',
      IpcHandler.createHandlerWrapper(
        async (request: UpdateChatRequest): Promise<ChatData> => {
          const result = await this.handleUpdateChat(request);
          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to update chat');
          }
          return result.data;
        },
        'chat:update'
      )
    );

    // Обработчик удаления чата
    ipcMain.handle(
      'chat:delete',
      IpcHandler.createHandlerWrapper(
        async (
          request: DeleteChatRequest
        ): Promise<{ deletedChatId: string }> => {
          const result = await this.handleDeleteChat(request);
          if (!result.success) {
            throw new Error(result.error || 'Failed to delete chat');
          }
          return { deletedChatId: result.deletedChatId || request.chatId };
        },
        'chat:delete'
      )
    );

    // Обработчик получения списка чатов
    ipcMain.handle(
      'chat:list',
      IpcHandler.createHandlerWrapper(
        async (
          request: ListChatsRequest = {}
        ): Promise<{
          chats: ChatFile[];
          totalCount: number;
          pagination: any;
        }> => {
          const result = await this.handleListChats(request);
          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to list chats');
          }
          return {
            chats: result.data,
            totalCount: result.totalCount || 0,
            pagination: result.pagination,
          };
        },
        'chat:list'
      )
    );

    // Обработчик добавления сообщения в чат
    ipcMain.handle(
      'chat:add-message',
      IpcHandler.createHandlerWrapper(
        async (
          request: AddMessageRequest
        ): Promise<{
          message: ChatMessage;
          updatedChat: ChatData;
        }> => {
          const result = await this.handleAddMessage(request);
          if (!result.success || !result.data || !result.updatedChat) {
            throw new Error(result.error || 'Failed to add message');
          }
          return {
            message: result.data,
            updatedChat: result.updatedChat,
          };
        },
        'chat:add-message'
      )
    );

    console.log('✅ Chat IPC handlers registered successfully');
  }

  /**
   * Удаляет все зарегистрированные IPC обработчики.
   * Используется при завершении работы приложения.
   */
  removeHandlers(): void {
    console.log('🧹 Removing chat IPC handlers...');

    ipcMain.removeHandler('chat:create');
    ipcMain.removeHandler('chat:get');
    ipcMain.removeHandler('chat:update');
    ipcMain.removeHandler('chat:delete');
    ipcMain.removeHandler('chat:list');
    ipcMain.removeHandler('chat:add-message');

    console.log('✅ Chat IPC handlers removed successfully');
  }

  /**
   * Обрабатывает создание нового чата.
   * Генерирует уникальный ID и временные метки, создает файл чата.
   *
   * @param request - Запрос на создание чата.
   * @returns Результат создания чата.
   */
  private async handleCreateChat(
    request: CreateChatRequest
  ): Promise<CreateChatResult> {
    try {
      // Валидация входных данных
      const validation = this.validateCreateChatRequest(request);
      if (!validation.valid) {
        return this.createErrorResult<ChatData>(
          validation.error || 'Invalid request'
        );
      }

      // Генерирует уникальный ID чата
      const chatId = this.generateChatId();
      const now = new Date().toISOString();

      // Создает структуру файла чата
      const chatFile: ChatFileStructure = {
        version: '1.0.0',
        metadata: {
          id: chatId,
          title: request.title,
          createdAt: now,
          updatedAt: now,
          settings: {
            model: request.defaultModel.name,
            provider: request.defaultModel.provider || 'ollama',
            parameters: {
              version: request.defaultModel.version,
              systemPrompt: request.systemPrompt,
              generationSettings: request.generationSettings,
              ...request.metadata,
            },
          },
        },
        messages: [],
      };

      // Определяет имя файла
      const fileName = this.getChatFileName(chatId);

      // Записывает файл чата
      const writeResult = await this.fileSystemService.writeChatFile(
        fileName,
        chatFile
      );
      if (!writeResult.success) {
        return this.createErrorResult<ChatData>(
          writeResult.error || 'Failed to create chat file'
        );
      }

      // Создает объект чата для ответа
      const chatData: ChatData = {
        id: chatId,
        title: request.title,
        messages: [],
        createdAt: now,
        updatedAt: now,
        defaultModel: (() => {
          const model: any = {
            name: request.defaultModel.name,
            provider: request.defaultModel.provider || 'ollama',
          };

          if (request.defaultModel.version) {
            model.version = request.defaultModel.version;
          }

          return model;
        })(),
        context: (() => {
          const context: any = {};

          if (request.systemPrompt) {
            context.systemPrompt = request.systemPrompt;
          }

          if (request.generationSettings) {
            context.generationSettings = request.generationSettings;
          }

          if (request.metadata && Object.keys(request.metadata).length > 0) {
            context.metadata = request.metadata;
          }

          return Object.keys(context).length > 0 ? context : undefined;
        })(),
        metadata:
          request.metadata && Object.keys(request.metadata).length > 0
            ? request.metadata
            : undefined,
      };

      console.log(`✅ Chat created successfully: ${chatId}`);
      return this.createSuccessResult(chatData, 'creating');
    } catch (error) {
      console.error('❌ Error creating chat:', error);
      return this.createErrorResult<ChatData>(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Обрабатывает получение чата по ID.
   * Загружает файл чата и возвращает его содержимое.
   *
   * @param request - Запрос на получение чата.
   * @returns Результат получения чата.
   */
  private async handleGetChat(request: GetChatRequest): Promise<GetChatResult> {
    try {
      // Валидация входных данных
      const validation = this.validateGetChatRequest(request);
      if (!validation.valid) {
        return this.createErrorResult<ChatData>(
          validation.error || 'Invalid request'
        );
      }

      // Определяет имя файла
      const fileName = this.getChatFileName(request.chatId);

      // Читает файл чата
      const readResult = await this.fileSystemService.readChatFile(fileName);
      if (!readResult.success) {
        return this.createErrorResult<ChatData>(
          readResult.error || 'Failed to read chat file'
        );
      }

      const chatFile = readResult.data;
      if (!chatFile) {
        return this.createErrorResult<ChatData>('Chat file data is null');
      }

      // Преобразует структуру файла в объект чата
      const chatData = this.convertFileToChatData(chatFile);

      // Применяет ограничения на количество сообщений если указаны
      if (request.messageLimit && request.messageLimit > 0) {
        const offset = request.messageOffset || 0;
        chatData.messages = chatData.messages.slice(
          offset,
          offset + request.messageLimit
        );
      }

      console.log(`✅ Chat retrieved successfully: ${request.chatId}`);
      return this.createSuccessResult(chatData, 'success');
    } catch (error) {
      console.error(`❌ Error getting chat ${request.chatId}:`, error);
      return this.createErrorResult<ChatData>(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Обрабатывает обновление чата.
   * Загружает существующий чат, обновляет его и сохраняет атомарно.
   *
   * @param request - Запрос на обновление чата.
   * @returns Результат обновления чата.
   */
  private async handleUpdateChat(
    request: UpdateChatRequest
  ): Promise<UpdateChatResult> {
    try {
      // Валидация входных данных
      const validation = this.validateUpdateChatRequest(request);
      if (!validation.valid) {
        return this.createErrorResult<ChatData>(
          validation.error || 'Invalid request'
        );
      }

      // Определяет имя файла
      const fileName = this.getChatFileName(request.chatId);

      // Читает существующий файл чата
      const readResult = await this.fileSystemService.readChatFile(fileName);
      if (!readResult.success) {
        return this.createErrorResult<ChatData>(
          readResult.error || 'Failed to read chat file'
        );
      }

      const chatFile = readResult.data;
      if (!chatFile) {
        return this.createErrorResult<ChatData>('Chat file data is null');
      }
      const now = new Date().toISOString();

      // Обновляет метаданные чата
      if (request.title !== undefined) {
        chatFile.metadata.title = request.title;
      }

      if (request.defaultModel !== undefined) {
        chatFile.metadata.settings.model = request.defaultModel.name;
        chatFile.metadata.settings.provider =
          request.defaultModel.provider || 'ollama';
        chatFile.metadata.settings.parameters = {
          ...chatFile.metadata.settings.parameters,
          version: request.defaultModel.version,
        };
      }

      if (request.systemPrompt !== undefined) {
        chatFile.metadata.settings.parameters = {
          ...chatFile.metadata.settings.parameters,
          systemPrompt: request.systemPrompt,
        };
      }

      if (request.generationSettings !== undefined) {
        chatFile.metadata.settings.parameters = {
          ...chatFile.metadata.settings.parameters,
          generationSettings: request.generationSettings,
        };
      }

      if (request.metadata !== undefined) {
        chatFile.metadata.settings.parameters = {
          ...chatFile.metadata.settings.parameters,
          ...request.metadata,
        };
      }

      // Обновляет временную метку
      chatFile.metadata.updatedAt = now;

      // Записывает обновленный файл чата
      const writeResult = await this.fileSystemService.writeChatFile(
        fileName,
        chatFile
      );
      if (!writeResult.success) {
        return this.createErrorResult<ChatData>(
          writeResult.error || 'Failed to update chat file'
        );
      }

      // Преобразует структуру файла в объект чата
      const chatData = this.convertFileToChatData(chatFile);

      console.log(`✅ Chat updated successfully: ${request.chatId}`);
      return this.createSuccessResult(chatData, 'updating');
    } catch (error) {
      console.error(`❌ Error updating chat ${request.chatId}:`, error);
      return this.createErrorResult<ChatData>(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Обрабатывает удаление чата.
   * Удаляет файл чата с возможностью создания резервной копии.
   *
   * @param request - Запрос на удаление чата.
   * @returns Результат удаления чата.
   */
  private async handleDeleteChat(
    request: DeleteChatRequest
  ): Promise<DeleteChatResult> {
    try {
      // Валидация входных данных
      const validation = this.validateDeleteChatRequest(request);
      if (!validation.valid) {
        return this.createErrorResult<void>(
          validation.error || 'Invalid request'
        );
      }

      // Проверяет подтверждение удаления
      if (!request.confirmed) {
        return this.createErrorResult<void>('Deletion not confirmed');
      }

      // Определяет имя файла
      const fileName = this.getChatFileName(request.chatId);

      // Создает резервную копию если требуется
      if (request.createBackup) {
        const readResult = await this.fileSystemService.readChatFile(fileName);
        if (readResult.success) {
          // Резервная копия создается автоматически в FileSystemService
          console.log(`📋 Backup will be created for chat: ${request.chatId}`);
        }
      }

      // Удаляет файл чата
      const deleteResult =
        await this.fileSystemService.deleteChatFile(fileName);
      if (!deleteResult.success) {
        return this.createErrorResult<void>(
          deleteResult.error || 'Failed to delete chat file'
        );
      }

      console.log(`✅ Chat deleted successfully: ${request.chatId}`);
      return this.createSuccessResult(undefined, 'deleting', {
        deletedChatId: request.chatId,
      });
    } catch (error) {
      console.error(`❌ Error deleting chat ${request.chatId}:`, error);
      return this.createErrorResult<void>(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Обрабатывает получение списка чатов.
   * Возвращает метаданные всех чатов для быстрого отображения.
   *
   * @param request - Запрос на получение списка чатов.
   * @returns Результат получения списка чатов.
   */
  private async handleListChats(
    request: ListChatsRequest
  ): Promise<ListChatsResult> {
    try {
      // Получает список файлов чатов
      const listResult = await this.fileSystemService.listChatFiles();
      if (!listResult.success) {
        return this.createErrorResult<ChatFile[]>(
          listResult.error || 'Failed to list chat files'
        );
      }

      const chatFiles: ChatFile[] = [];

      // Преобразует информацию о файлах в объекты чатов
      for (const fileInfo of listResult.data || []) {
        try {
          // Читает файл чата для получения метаданных
          const readResult = await this.fileSystemService.readChatFile(
            fileInfo.fileName
          );
          if (readResult.success && readResult.data) {
            const chatFile = this.convertFileToChatFile(
              readResult.data,
              fileInfo
            );
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

      // Применяет фильтры и сортировку
      const filteredChats = this.applyChatFilters(chatFiles, request);
      const sortedChats = this.applyChatSorting(filteredChats, request);

      // Применяет пагинацию
      const paginatedChats = this.applyPagination(sortedChats, request);

      // Создает информацию о пагинации
      const pagination = this.createPaginationInfo(
        sortedChats.length,
        request.limit || 50,
        request.offset || 0
      );

      console.log(`✅ Listed ${paginatedChats.length} chats`);
      return this.createSuccessResult(paginatedChats, 'success', {
        totalCount: sortedChats.length,
        pagination,
      });
    } catch (error) {
      console.error('❌ Error listing chats:', error);
      return this.createErrorResult<ChatFile[]>(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Обрабатывает добавление сообщения в чат.
   * Загружает чат, добавляет сообщение и сохраняет атомарно.
   *
   * @param request - Запрос на добавление сообщения.
   * @returns Результат добавления сообщения.
   */
  private async handleAddMessage(
    request: AddMessageRequest
  ): Promise<AddMessageResult> {
    try {
      // Валидация входных данных
      const validation = this.validateAddMessageRequest(request);
      if (!validation.valid) {
        return this.createErrorResult<ChatMessage>(
          validation.error || 'Invalid request'
        );
      }

      // Определяет имя файла
      const fileName = this.getChatFileName(request.chatId);

      // Читает существующий файл чата
      const readResult = await this.fileSystemService.readChatFile(fileName);
      if (!readResult.success) {
        return this.createErrorResult<ChatMessage>(
          readResult.error || 'Failed to read chat file'
        );
      }

      const chatFile = readResult.data;
      if (!chatFile) {
        return this.createErrorResult<ChatMessage>('Chat file data is null');
      }
      const now = new Date().toISOString();

      // Создает новое сообщение
      const newMessage: ChatMessage = {
        id: this.generateMessageId(),
        role: request.role,
        content: request.content,
        timestamp: now,
        model: request.model,
        context: request.context,
        metadata: request.metadata,
      };

      // Добавляет сообщение в чат
      chatFile.messages.push({
        id: newMessage.id,
        type: newMessage.role,
        content: newMessage.content,
        timestamp: newMessage.timestamp,
        metadata: {
          model: newMessage.model,
          context: newMessage.context,
          ...newMessage.metadata,
        },
      });

      // Обновляет временную метку чата
      chatFile.metadata.updatedAt = now;

      // Записывает обновленный файл чата
      const writeResult = await this.fileSystemService.writeChatFile(
        fileName,
        chatFile
      );
      if (!writeResult.success) {
        return this.createErrorResult<ChatMessage>(
          writeResult.error || 'Failed to add message'
        );
      }

      // Преобразует структуру файла в объект чата
      const updatedChat = this.convertFileToChatData(chatFile);

      console.log(`✅ Message added successfully to chat: ${request.chatId}`);
      return this.createSuccessResult(newMessage, 'updating', { updatedChat });
    } catch (error) {
      console.error(
        `❌ Error adding message to chat ${request.chatId}:`,
        error
      );
      return this.createErrorResult<ChatMessage>(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Генерирует криптографически стойкий уникальный ID для чата.
   *
   * @returns Уникальный ID чата.
   */
  private generateChatId(): string {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `chat_${timestamp}_${randomBytes}`;
  }

  /**
   * Генерирует криптографически стойкий уникальный ID для сообщения.
   *
   * @returns Уникальный ID сообщения.
   */
  private generateMessageId(): string {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `msg_${timestamp}_${randomBytes}`;
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
   * Преобразует структуру файла чата в объект ChatData.
   *
   * @param chatFile - Структура файла чата.
   * @returns Объект чата.
   */
  private convertFileToChatData(chatFile: ChatFileStructure): ChatData {
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

        const result: any = {
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
        const model: any = {
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
        const context: any = {};

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
  private convertFileToChatFile(
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
        const model: any = {
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
            preview: lastMessage.content.substring(0, 100),
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
   * Применяет фильтры к списку чатов.
   *
   * @param chats - Список чатов.
   * @param request - Параметры фильтрации.
   * @returns Отфильтрованный список чатов.
   */
  private applyChatFilters(
    chats: ChatFile[],
    request: ListChatsRequest
  ): ChatFile[] {
    let filteredChats = [...chats];

    // Фильтр по дате создания
    if (request.createdAfter) {
      const afterDate = new Date(request.createdAfter);
      filteredChats = filteredChats.filter(
        chat => new Date(chat.createdAt) >= afterDate
      );
    }

    if (request.createdBefore) {
      const beforeDate = new Date(request.createdBefore);
      filteredChats = filteredChats.filter(
        chat => new Date(chat.createdAt) <= beforeDate
      );
    }

    // Фильтр по дате обновления
    if (request.updatedAfter) {
      const afterDate = new Date(request.updatedAfter);
      filteredChats = filteredChats.filter(
        chat => new Date(chat.updatedAt) >= afterDate
      );
    }

    if (request.updatedBefore) {
      const beforeDate = new Date(request.updatedBefore);
      filteredChats = filteredChats.filter(
        chat => new Date(chat.updatedAt) <= beforeDate
      );
    }

    // Фильтр по поисковому запросу
    if (request.searchQuery) {
      const query = request.searchQuery.toLowerCase();
      filteredChats = filteredChats.filter(
        chat =>
          chat.title.toLowerCase().includes(query) ||
          chat.lastMessage?.preview.toLowerCase().includes(query)
      );
    }

    // Фильтр по модели
    if (request.modelFilter) {
      filteredChats = filteredChats.filter(chat =>
        chat.defaultModel.name.includes(request.modelFilter as string)
      );
    }

    return filteredChats;
  }

  /**
   * Применяет сортировку к списку чатов.
   *
   * @param chats - Список чатов.
   * @param request - Параметры сортировки.
   * @returns Отсортированный список чатов.
   */
  private applyChatSorting(
    chats: ChatFile[],
    request: ListChatsRequest
  ): ChatFile[] {
    const sortBy = request.sortBy || 'updatedAt';
    const sortOrder = request.sortOrder || 'desc';

    return [...chats].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'createdAt':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'messageCount':
          comparison = a.messageCount - b.messageCount;
          break;
        default:
          comparison =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Применяет пагинацию к списку чатов.
   *
   * @param chats - Список чатов.
   * @param request - Параметры пагинации.
   * @returns Пагинированный список чатов.
   */
  private applyPagination(
    chats: ChatFile[],
    request: ListChatsRequest
  ): ChatFile[] {
    const limit = request.limit || 50;
    const offset = request.offset || 0;

    return chats.slice(offset, offset + limit);
  }

  /**
   * Создает информацию о пагинации.
   *
   * @param totalCount - Общее количество элементов.
   * @param pageSize - Размер страницы.
   * @param offset - Смещение.
   * @returns Информация о пагинации.
   */
  private createPaginationInfo(
    totalCount: number,
    pageSize: number,
    offset: number
  ) {
    const currentPage = Math.floor(offset / pageSize) + 1;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      page: currentPage,
      pageSize,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1,
    };
  }

  /**
   * Создает успешный результат операции.
   *
   * @param data - Данные результата.
   * @param status - Статус операции.
   * @param additionalData - Дополнительные данные.
   * @returns Успешный результат операции.
   */
  private createSuccessResult<T>(
    data: T,
    status:
      | 'idle'
      | 'loading'
      | 'creating'
      | 'updating'
      | 'deleting'
      | 'success'
      | 'error',
    additionalData?: Record<string, unknown>
  ): ChatOperationResult<T> {
    return {
      success: true,
      data,
      status,
      timestamp: new Date().toISOString(),
      ...additionalData,
    };
  }

  /**
   * Создает результат операции с ошибкой.
   *
   * @param error - Сообщение об ошибке.
   * @returns Результат операции с ошибкой.
   */
  private createErrorResult<T>(error: string): ChatOperationResult<T> {
    return {
      success: false,
      error,
      status: 'error',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Валидирует запрос на создание чата.
   *
   * @param request - Запрос на создание чата.
   * @returns Результат валидации.
   */
  private validateCreateChatRequest(request: CreateChatRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.title || request.title.trim().length === 0) {
      return { valid: false, error: 'Title is required' };
    }

    if (request.title.length > 200) {
      return { valid: false, error: 'Title is too long (max 200 characters)' };
    }

    if (!request.defaultModel || !request.defaultModel.name) {
      return { valid: false, error: 'Default model is required' };
    }

    return { valid: true };
  }

  /**
   * Валидирует запрос на получение чата.
   *
   * @param request - Запрос на получение чата.
   * @returns Результат валидации.
   */
  private validateGetChatRequest(request: GetChatRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.chatId || request.chatId.trim().length === 0) {
      return { valid: false, error: 'Chat ID is required' };
    }

    if (request.messageLimit && request.messageLimit < 0) {
      return { valid: false, error: 'Message limit must be positive' };
    }

    if (request.messageOffset && request.messageOffset < 0) {
      return { valid: false, error: 'Message offset must be positive' };
    }

    return { valid: true };
  }

  /**
   * Валидирует запрос на обновление чата.
   *
   * @param request - Запрос на обновление чата.
   * @returns Результат валидации.
   */
  private validateUpdateChatRequest(request: UpdateChatRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.chatId || request.chatId.trim().length === 0) {
      return { valid: false, error: 'Chat ID is required' };
    }

    if (request.title !== undefined && request.title.trim().length === 0) {
      return { valid: false, error: 'Title cannot be empty' };
    }

    if (request.title && request.title.length > 200) {
      return { valid: false, error: 'Title is too long (max 200 characters)' };
    }

    return { valid: true };
  }

  /**
   * Валидирует запрос на удаление чата.
   *
   * @param request - Запрос на удаление чата.
   * @returns Результат валидации.
   */
  private validateDeleteChatRequest(request: DeleteChatRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.chatId || request.chatId.trim().length === 0) {
      return { valid: false, error: 'Chat ID is required' };
    }

    return { valid: true };
  }

  /**
   * Валидирует запрос на добавление сообщения.
   *
   * @param request - Запрос на добавление сообщения.
   * @returns Результат валидации.
   */
  private validateAddMessageRequest(request: AddMessageRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.chatId || request.chatId.trim().length === 0) {
      return { valid: false, error: 'Chat ID is required' };
    }

    if (
      !request.role ||
      !['user', 'assistant', 'system'].includes(request.role)
    ) {
      return { valid: false, error: 'Valid role is required' };
    }

    if (!request.content || request.content.trim().length === 0) {
      return { valid: false, error: 'Content is required' };
    }

    if (request.content.length > 10000) {
      return {
        valid: false,
        error: 'Content is too long (max 10000 characters)',
      };
    }

    return { valid: true };
  }
}

/**
 * Создает экземпляр ChatHandlers.
 *
 * @param fileSystemService - Сервис для работы с файловой системой.
 * @returns Экземпляр ChatHandlers.
 */
export function createChatHandlers(
  fileSystemService: FileSystemService
): ChatHandlers {
  return new ChatHandlers(fileSystemService);
}
