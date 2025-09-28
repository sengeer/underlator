/**
 * @module IpcHandlersTypes
 * Типы для обработки IPC сообщений.
 * Предоставляет типы для всех IPC операций.
 */

/**
 * Интерфейс для IPC сообщений.
 * Стандартная структура для всех IPC операций.
 */
export interface IpcMessage<T = any> {
  /** Тип операции */
  type: string;
  /** Данные сообщения */
  data?: T;
  /** Ошибка операции */
  error?: string;
  /** Статус операции */
  status: 'success' | 'error' | 'progress';
  /** ID сообщения для отслеживания */
  id?: string;
}

/**
 * Интерфейс для IPC ответов.
 * Структура ответов от main процесса.
 */
export interface IpcResponse<T = any> {
  /** Успешность операции */
  success: boolean;
  /** Данные ответа */
  data?: T;
  /** Ошибка операции */
  error?: string;
  /** ID ответа для отслеживания */
  id?: string;
}
