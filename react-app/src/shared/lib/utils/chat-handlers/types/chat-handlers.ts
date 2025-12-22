/**
 * @module ChatHandlersTypes
 * Типы для chat handlers.
 * Определяет интерфейсы для всех handlers обработки чата.
 */

import type { ModelRequestContext } from '../../../hooks/use-model/types/feature-provider';
import type {
  ChatContext,
  ChatMessage,
} from '../../../hooks/use-model/types/use-model';

/**
 * Результат валидации запроса чата.
 * Используется для проверки корректности входных данных.
 */
export interface ChatValidationResult {
  /** Успешна ли валидация */
  success: boolean;
  /** Сообщение об ошибке, если валидация не прошла */
  error?: string;
}

/**
 * Результат загрузки RAG контекста.
 * Содержит отформатированный RAG контекст или ошибку.
 */
export interface RAGContextResult {
  /** Успешна ли загрузка */
  success: boolean;
  /** RAG контекст в виде строки */
  context?: string;
  /** Сообщение об ошибке, если загрузка не прошла */
  error?: string;
}

/**
 * Результат загрузки контекста чата.
 * Содержит загруженный контекст чата или ошибку.
 */
export interface ChatContextResult {
  /** Успешна ли загрузка */
  success: boolean;
  /** Контекст чата */
  context?: ChatContext;
  /** Сообщение об ошибке, если загрузка не прошла */
  error?: string;
}

/**
 * Результат построения промпта для чата.
 * Содержит построенный промпт или ошибку.
 */
export interface ChatPromptResult {
  /** Успешна ли постройка промпта */
  success: boolean;
  /** Построенный промпт */
  prompt?: string;
  /** Сообщение об ошибке, если постройка не прошла */
  error?: string;
}

/**
 * Обработчик streaming ответов.
 * Используется для накопления и обработки streaming ответов от LLM.
 */
export interface StreamingResponseHandler {
  /** Накопленный полный ответ */
  fullResponse: string;
  /** Обработка нового чанка ответа */
  handleChunk: (chunk: string) => void;
  /** Обработка ошибки */
  handleError: (error: string) => void;
}

/**
 * Результат сохранения истории чата.
 * Используется для отслеживания успешности сохранения сообщений.
 */
export interface ChatHistoryResult {
  /** Успешно ли сохранено сообщение пользователя */
  userMessageSaved: boolean;
  /** Успешно ли сохранено сообщение ассистента */
  assistantMessageSaved: boolean;
  /** Ошибки при сохранении */
  errors?: string[];
}

/**
 * Конфигурация для сохранения истории чата.
 * Содержит данные для сохранения сообщений пользователя и ассистента.
 */
export interface ChatHistorySaveConfig {
  /** Контекст запроса к модели */
  requestContext: ModelRequestContext;
  /** Сообщение пользователя (опционально, если уже сохранено) */
  userMessage: ChatMessage | null;
  /** Сообщение ассистента */
  assistantMessage: ChatMessage;
  /** Полный ответ от модели */
  fullResponse: string;
}
