/**
 * @module ChatRagLoader
 * Загрузка RAG контекста для режима чата.
 * Обеспечивает получение статистики коллекции, поиск документов и форматирование RAG контекста.
 */

import { ragIpc } from '../../../apis/rag-ipc/';
import type { ModelRequestContext } from '../../hooks/use-model/types/feature-provider';
import callANotificationWithALog from '../../utils/call-a-notification-with-a-log';
import type { RAGContextResult } from './types/chat-handlers';

/**
 * Загружает RAG контекст для чата.
 * Получает статистику коллекции, ищет релевантные документы и форматирует контекст.
 *
 * @param context - Контекст запроса к модели.
 * @returns Результат загрузки RAG контекста.
 */
export async function loadRagContext(
  context: ModelRequestContext
): Promise<RAGContextResult> {
  try {
    if (!context.chatId) {
      return {
        success: false,
        error: 'Chat ID is required for RAG context loading',
      };
    }

    // Получает статистику коллекции
    const statsResult = await getCollectionStats(context);

    if (!statsResult.success) {
      return statsResult;
    }

    // Если коллекция пуста, возвращает пустой контекст
    if (statsResult.sizeBytes === 0) {
      return {
        success: true,
        context: '',
      };
    }

    // Ищет релевантные документы
    const searchResult = await searchRelevantDocuments(context);

    if (!searchResult.success) {
      return searchResult;
    }

    // Форматирует RAG контекст
    const formattedContext = formatRagContext(searchResult.sources || []);

    return {
      success: true,
      context: formattedContext,
    };
  } catch (error) {
    return handleRagErrors(error, context);
  }
}

/**
 * Получает статистику коллекции RAG.
 *
 * @param context - Контекст запроса к модели.
 * @returns Результат получения статистики.
 */
async function getCollectionStats(
  context: ModelRequestContext
): Promise<{ success: boolean; sizeBytes?: number; error?: string }> {
  try {
    if (!context.chatId) {
      return {
        success: false,
        error: 'Chat ID is required',
      };
    }

    const stats = await ragIpc.getCollectionStats(context.chatId);

    return {
      success: true,
      sizeBytes: stats.sizeBytes || 0,
    };
  } catch (error) {
    const errorMessage = `Failed getting RAG stats: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`;

    callANotificationWithALog(
      context.dispatch,
      context.t`Failed getting RAG stats`,
      errorMessage
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Ищет релевантные документы по запросу.
 *
 * @param context - Контекст запроса к модели.
 * @returns Результат поиска документов.
 */
async function searchRelevantDocuments(
  context: ModelRequestContext
): Promise<{ success: boolean; sources?: any[]; error?: string }> {
  try {
    if (!context.chatId) {
      return {
        success: false,
        error: 'Chat ID is required',
      };
    }

    const message =
      typeof context.text === 'string' ? context.text : context.text.join(' ');

    const searchResult = await ragIpc.queryDocuments(
      {
        query: message,
        chatId: context.chatId,
      },
      context.ragConfig
    );

    return {
      success: true,
      sources: searchResult.sources || [],
    };
  } catch (error) {
    const errorMessage = `Failed getting RAG context: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`;

    callANotificationWithALog(
      context.dispatch,
      context.t`Failed getting RAG context`,
      errorMessage
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Форматирует RAG контекст в строку.
 * Преобразует источники в читаемый формат для промпта.
 *
 * @param sources - Массив источников из RAG поиска.
 * @returns Отформатированный RAG контекст.
 */
function formatRagContext(sources: any[]): string {
  if (!sources || sources.length === 0) {
    return '';
  }

  return sources
    .map((source: any, index: number) => {
      // Извлекает текстовое содержимое из source
      const content =
        typeof source === 'string'
          ? source
          : source.content || JSON.stringify(source);

      return `${index + 1}. ${content}`;
    })
    .join('\n\n');
}

/**
 * Обрабатывает ошибки RAG с информативными сообщениями.
 *
 * @param error - Ошибка для обработки.
 * @param context - Контекст запроса к модели.
 * @returns Результат с ошибкой.
 */
function handleRagErrors(
  error: unknown,
  context: ModelRequestContext
): RAGContextResult {
  const errorMessage =
    error instanceof Error ? error.message : 'Unknown RAG error';

  callANotificationWithALog(
    context.dispatch,
    context.t`RAG error`,
    errorMessage
  );

  return {
    success: false,
    error: errorMessage,
  };
}
