/**
 * @module FileValidators
 * Фабрика валидаторов для разных типов файлов.
 * Обеспечивает типобезопасную валидацию структуры файлов.
 */

import type {
  FileStructure,
  FileValidationResult,
  FileTypeConfig,
} from '../types/filesystem';
import { APP_VERSION } from '../constants/shared';

/**
 * Базовый валидатор для универсальной структуры файла.
 */
export abstract class BaseFileValidator {
  /**
   * Абстрактный метод для валидации структуры файла.
   *
   * @param data - Данные для валидации.
   * @returns Результат валидации.
   */
  abstract validate(data: unknown): data is FileStructure;

  /**
   * Валидирует базовую структуру файла.
   *
   * @param data - Данные для валидации.
   * @returns Результат валидации.
   */
  protected validateBaseStructure(data: unknown): FileValidationResult {
    if (!data || typeof data !== 'object') {
      return {
        valid: false,
        error: 'Invalid file structure: not an object',
      };
    }

    const fileData = data as Record<string, unknown>;

    // Проверяет версию
    if (!fileData['version'] || typeof fileData['version'] !== 'string') {
      return {
        valid: false,
        error: 'Missing or invalid version field',
      };
    }

    // Проверяет метаданные
    if (!fileData['metadata'] || typeof fileData['metadata'] !== 'object') {
      return {
        valid: false,
        error: 'Missing or invalid metadata field',
      };
    }

    // Проверяет данные
    if (fileData['data'] === undefined) {
      return {
        valid: false,
        error: 'Missing data field',
      };
    }

    return { valid: true };
  }

  /**
   * Валидирует версию файла.
   *
   * @param version - Версия для проверки.
   * @param supportedVersions - Поддерживаемые версии.
   * @returns Результат валидации.
   */
  protected validateVersion(
    version: string,
    supportedVersions: string[]
  ): FileValidationResult {
    if (!supportedVersions.includes(version)) {
      return {
        valid: false,
        error: `Unsupported file version: ${version}. Supported versions: ${supportedVersions.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Валидирует размер данных.
   *
   * @param data - Данные для проверки.
   * @param maxSize - Максимальный размер в байтах.
   * @returns Результат валидации.
   */
  protected validateDataSize(
    data: unknown,
    maxSize: number
  ): FileValidationResult {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonString]).size;

    if (sizeInBytes > maxSize) {
      return {
        valid: false,
        error: `Data size exceeds maximum allowed size: ${sizeInBytes} bytes (max: ${maxSize} bytes)`,
      };
    }

    return { valid: true };
  }

  /**
   * Валидирует обязательные поля в объекте.
   *
   * @param obj - Объект для проверки.
   * @param requiredFields - Обязательные поля.
   * @param context - Контекст для сообщений об ошибках.
   * @returns Результат валидации.
   */
  protected validateRequiredFields(
    obj: Record<string, unknown>,
    requiredFields: string[],
    context: string = 'object'
  ): FileValidationResult {
    for (const field of requiredFields) {
      if (!obj[field]) {
        return {
          valid: false,
          error: `Missing required field '${field}' in ${context}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Валидирует длину строки.
   *
   * @param value - Значение для проверки.
   * @param fieldName - Название поля.
   * @param maxLength - Максимальная длина.
   * @returns Результат валидации.
   */
  protected validateStringLength(
    value: string,
    fieldName: string,
    maxLength: number
  ): FileValidationResult {
    if (value.length > maxLength) {
      return {
        valid: false,
        error: `${fieldName} is too long: ${value.length} characters (max: ${maxLength})`,
      };
    }

    return { valid: true };
  }

  /**
   * Валидирует массив.
   *
   * @param arr - Массив для проверки.
   * @param fieldName - Название поля.
   * @param maxLength - Максимальная длина массива.
   * @param itemValidator - Валидатор элементов массива.
   * @returns Результат валидации.
   */
  protected validateArray(
    arr: unknown[],
    fieldName: string,
    maxLength: number,
    itemValidator?: (item: unknown, index: number) => FileValidationResult
  ): FileValidationResult {
    if (!Array.isArray(arr)) {
      return {
        valid: false,
        error: `${fieldName} must be an array`,
      };
    }

    if (arr.length > maxLength) {
      return {
        valid: false,
        error: `${fieldName} is too long: ${arr.length} items (max: ${maxLength})`,
      };
    }

    if (itemValidator) {
      for (let i = 0; i < arr.length; i++) {
        const itemResult = itemValidator(arr[i], i);
        if (!itemResult.valid) {
          return {
            valid: false,
            error: `${fieldName}[${i}]: ${itemResult.error}`,
          };
        }
      }
    }

    return { valid: true };
  }
}

/**
 * Валидатор для чатов.
 */
export class ChatFileValidator extends BaseFileValidator {
  private readonly supportedVersions = [APP_VERSION];
  private readonly maxTitleLength = 200;
  private readonly maxMessageLength = 50000;
  private readonly maxMessagesCount = 10000;
  private readonly requiredMetadataFields = [
    'id',
    'title',
    'createdAt',
    'updatedAt',
  ];
  private readonly requiredMessageFields = [
    'id',
    'type',
    'content',
    'timestamp',
  ];

  /**
   * Валидирует структуру файла чата.
   *
   * @param data - Данные для валидации.
   * @returns Результат валидации.
   */
  validate(data: unknown): data is FileStructure {
    const baseResult = this.validateBaseStructure(data);
    if (!baseResult.valid) {
      return false;
    }

    const fileData = data as Record<string, unknown>;

    // Валидирует версию
    const versionResult = this.validateVersion(
      fileData['version'] as string,
      this.supportedVersions
    );
    if (!versionResult.valid) {
      return false;
    }

    // Валидирует метаданные
    const metadataResult = this.validateMetadata(
      fileData['metadata'] as Record<string, unknown>
    );
    if (!metadataResult.valid) {
      return false;
    }

    // Валидирует сообщения
    const messagesResult = this.validateMessages(fileData['data'] as unknown[]);
    if (!messagesResult.valid) {
      return false;
    }

    return true;
  }

  /**
   * Валидирует метаданные чата.
   *
   * @param metadata - Метаданные для валидации.
   * @returns Результат валидации.
   */
  private validateMetadata(
    metadata: Record<string, unknown>
  ): FileValidationResult {
    // Проверяет обязательные поля
    const requiredResult = this.validateRequiredFields(
      metadata,
      this.requiredMetadataFields,
      'chat metadata'
    );
    if (!requiredResult.valid) {
      return requiredResult;
    }

    // Проверяет длину названия
    const title = metadata['title'] as string;
    const titleResult = this.validateStringLength(
      title,
      'Title',
      this.maxTitleLength
    );
    if (!titleResult.valid) {
      return titleResult;
    }

    // Проверяет настройки
    if (!metadata['settings'] || typeof metadata['settings'] !== 'object') {
      return {
        valid: false,
        error: 'Missing or invalid settings field in metadata',
      };
    }

    const settings = metadata['settings'] as Record<string, unknown>;
    if (!settings['model'] || typeof settings['model'] !== 'string') {
      return {
        valid: false,
        error: 'Missing or invalid model field in settings',
      };
    }

    if (!settings['provider'] || typeof settings['provider'] !== 'string') {
      return {
        valid: false,
        error: 'Missing or invalid provider field in settings',
      };
    }

    return { valid: true };
  }

  /**
   * Валидирует сообщения чата.
   *
   * @param messages - Сообщения для валидации.
   * @returns Результат валидации.
   */
  private validateMessages(messages: unknown[]): FileValidationResult {
    const arrayResult = this.validateArray(
      messages,
      'messages',
      this.maxMessagesCount,
      this.validateMessage.bind(this)
    );

    return arrayResult;
  }

  /**
   * Валидирует отдельное сообщение.
   *
   * @param message - Сообщение для валидации.
   * @param index - Индекс сообщения.
   * @returns Результат валидации.
   */
  private validateMessage(
    message: unknown,
    index: number
  ): FileValidationResult {
    if (!message || typeof message !== 'object') {
      return {
        valid: false,
        error: `Invalid message at index ${index}`,
      };
    }

    const messageObj = message as Record<string, unknown>;

    // Проверяет обязательные поля
    const requiredResult = this.validateRequiredFields(
      messageObj,
      this.requiredMessageFields,
      `message at index ${index}`
    );
    if (!requiredResult.valid) {
      return requiredResult;
    }

    // Проверяет длину содержимого
    const content = messageObj['content'] as string;
    const contentResult = this.validateStringLength(
      content,
      'Message content',
      this.maxMessageLength
    );
    if (!contentResult.valid) {
      return contentResult;
    }

    // Проверяет тип сообщения
    const type = messageObj['type'] as string;
    if (!['user', 'assistant', 'system'].includes(type)) {
      return {
        valid: false,
        error: `Invalid message type '${type}' at index ${index}`,
      };
    }

    return { valid: true };
  }
}

/**
 * Валидатор для документов.
 */
export class DocumentFileValidator extends BaseFileValidator {
  private readonly supportedVersions = [APP_VERSION];
  private readonly maxTitleLength = 500;
  private readonly maxContentLength = 1000000; // 1MB
  private readonly requiredMetadataFields = [
    'id',
    'title',
    'createdAt',
    'updatedAt',
  ];

  /**
   * Валидирует структуру файла документа.
   *
   * @param data - Данные для валидации.
   * @returns Результат валидации.
   */
  validate(data: unknown): data is FileStructure {
    const baseResult = this.validateBaseStructure(data);
    if (!baseResult.valid) {
      return false;
    }

    const fileData = data as Record<string, unknown>;

    // Валидирует версию
    const versionResult = this.validateVersion(
      fileData['version'] as string,
      this.supportedVersions
    );
    if (!versionResult.valid) {
      return false;
    }

    // Валидирует метаданные
    const metadataResult = this.validateMetadata(
      fileData['metadata'] as Record<string, unknown>
    );
    if (!metadataResult.valid) {
      return false;
    }

    // Валидирует содержимое документа
    const contentResult = this.validateContent(
      fileData['data'] as Record<string, unknown>
    );
    if (!contentResult.valid) {
      return false;
    }

    return true;
  }

  /**
   * Валидирует метаданные документа.
   *
   * @param metadata - Метаданные для валидации.
   * @returns Результат валидации.
   */
  private validateMetadata(
    metadata: Record<string, unknown>
  ): FileValidationResult {
    // Проверяет обязательные поля
    const requiredResult = this.validateRequiredFields(
      metadata,
      this.requiredMetadataFields,
      'document metadata'
    );
    if (!requiredResult.valid) {
      return requiredResult;
    }

    // Проверяет длину названия
    const title = metadata['title'] as string;
    const titleResult = this.validateStringLength(
      title,
      'Title',
      this.maxTitleLength
    );
    if (!titleResult.valid) {
      return titleResult;
    }

    return { valid: true };
  }

  /**
   * Валидирует содержимое документа.
   *
   * @param content - Содержимое для валидации.
   * @returns Результат валидации.
   */
  private validateContent(
    content: Record<string, unknown>
  ): FileValidationResult {
    if (!content || typeof content !== 'object') {
      return {
        valid: false,
        error: 'Document content must be an object',
      };
    }

    // Проверяет наличие текстового содержимого
    if (!content['text'] || typeof content['text'] !== 'string') {
      return {
        valid: false,
        error: 'Document must have text content',
      };
    }

    // Проверяет длину текста
    const text = content['text'] as string;
    const textResult = this.validateStringLength(
      text,
      'Document text',
      this.maxContentLength
    );
    if (!textResult.valid) {
      return textResult;
    }

    return { valid: true };
  }
}

/**
 * Фабрика валидаторов файлов.
 */
export class FileValidatorFactory {
  private static validators = new Map<string, BaseFileValidator>([
    ['chat', new ChatFileValidator()],
    ['document', new DocumentFileValidator()],
  ]);

  /**
   * Получает валидатор для указанного типа файла.
   *
   * @param fileType - Тип файла.
   * @returns Валидатор или undefined если тип не поддерживается.
   */
  static getValidator(fileType: string): BaseFileValidator | undefined {
    return this.validators.get(fileType);
  }

  /**
   * Регистрирует новый валидатор для типа файла.
   *
   * @param fileType - Тип файла.
   * @param validator - Валидатор.
   */
  static registerValidator(
    fileType: string,
    validator: BaseFileValidator
  ): void {
    this.validators.set(fileType, validator);
  }

  /**
   * Получает список поддерживаемых типов файлов.
   *
   * @returns Массив поддерживаемых типов.
   */
  static getSupportedTypes(): string[] {
    return Array.from(this.validators.keys());
  }

  /**
   * Проверяет поддерживается ли тип файла.
   *
   * @param fileType - Тип файла.
   * @returns true если тип поддерживается.
   */
  static isTypeSupported(fileType: string): boolean {
    return this.validators.has(fileType);
  }
}

/**
 * Создает конфигурацию для типа файла чата.
 *
 * @returns Конфигурация для чатов.
 */
export function createChatFileTypeConfig(): FileTypeConfig {
  return {
    folder: 'chats',
    extension: '.chat.json',
    validator: (data: unknown): data is FileStructure => {
      const validator = FileValidatorFactory.getValidator('chat');
      return validator ? validator.validate(data) : false;
    },
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1000,
  };
}
