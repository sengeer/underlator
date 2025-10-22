/**
 * @module ChatContextUtils
 * Универсальные утилиты для управления контекстом чата с поддержкой суммирования и оптимизации.
 * Предоставляет функции для построения промптов, управления контекстом, подсчета токенов
 * и форматирования сообщений под различные провайдеры LLM.
 */

import { PROVIDER_TOKEN_LIMITS } from '../constants/chat-context';
import type {
  ProviderTokenLimits,
  ContextCache,
  ChatPromptConfig,
  SummarizationResult,
} from '../types/chat-context';
import type { ChatContext, ChatMessage } from '../types/use-model';

/**
 * Результат операции с контекстом чата.
 * Алгебраический тип для обработки успешных и ошибочных результатов.
 */
export type ChatContextResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Глобальный кэш для контекста чата.
 */
const contextCache = new Map<string, ContextCache>();

/**
 * Время жизни кэша по умолчанию (5 минут).
 */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Генерирует хэш для контекста чата.
 * Используется для создания ключей кэша.
 *
 * @param context - Контекст чата для хэширования.
 * @returns Хэш строка контекста.
 */
function generateContextHash(context: ChatContext): string {
  const contextString = JSON.stringify({
    messages: context.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content.substring(0, 100), // Первые 100 символов для хэша
    })),
    maxContextMessages: context.maxContextMessages,
    systemPrompt: context.systemPrompt,
  });

  // Простой хэш на основе длины и содержимого
  let hash = 0;
  for (let i = 0; i < contextString.length; i++) {
    const char = contextString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Преобразование в 32-битное число
  }

  return Math.abs(hash).toString(36);
}

/**
 * Очищает устаревшие записи из кэша.
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, cache] of contextCache.entries()) {
    if (now - cache.timestamp > cache.ttl) {
      contextCache.delete(key);
    }
  }
}

/**
 * Получает конфигурацию лимитов токенов для провайдера.
 *
 * @param provider - Название провайдера.
 * @returns Конфигурация лимитов или значения по умолчанию.
 */
export function getProviderTokenLimits(
  provider: string = 'Ollama'
): ProviderTokenLimits {
  return PROVIDER_TOKEN_LIMITS[provider] || PROVIDER_TOKEN_LIMITS['Ollama'];
}

/**
 * Подсчитывает приблизительное количество токенов в тексте.
 * Использует эмпирическую формулу: ~4 символа = 1 токен.
 *
 * @param text - Текст для подсчета токенов.
 * @returns Приблизительное количество токенов.
 */
export function calculateContextTokens(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Эмпирическая формула: ~4 символа = 1 токен для большинства языков
  // Учитываем пробелы и специальные символы
  const cleanedText = text.trim();
  if (cleanedText.length === 0) {
    return 0;
  }

  // Более точная оценка с учетом слов и символов
  const words = cleanedText.split(/\s+/).length;
  const chars = cleanedText.length;

  // Среднее между оценкой по словам (1 слово ≈ 1.3 токена) и по символам
  const tokenEstimateByWords = Math.ceil(words * 1.3);
  const tokenEstimateByChars = Math.ceil(chars / 4);

  return Math.max(tokenEstimateByWords, tokenEstimateByChars);
}

/**
 * Подсчитывает общее количество токенов в контексте чата.
 *
 * @param context - Контекст чата.
 * @returns Общее количество токенов.
 */
export function calculateChatContextTokens(context: ChatContext): number {
  let totalTokens = 0;

  // Токены системного промпта
  if (context.systemPrompt) {
    totalTokens += calculateContextTokens(context.systemPrompt);
  }

  // Токены всех сообщений
  for (const message of context.messages) {
    totalTokens += calculateContextTokens(message.content);

    // Дополнительные токены для роли и форматирования
    totalTokens += 4; // ~4 токена на сообщение для роли и форматирования
  }

  return totalTokens;
}

/**
 * Извлекает ключевую информацию из сообщений для суммирования.
 * Анализирует содержимое сообщений и выделяет важные фрагменты.
 *
 * @param messages - Массив сообщений для анализа.
 * @returns Ключевая информация в виде строки.
 */
export function extractKeyInformation(messages: ChatMessage[]): string {
  if (!messages || messages.length === 0) {
    return '';
  }

  const keyPoints: string[] = [];

  for (const message of messages) {
    const content = message.content.trim();
    if (!content) continue;

    // Извлекает ключевые фразы (вопросы, важные утверждения)
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      // Приоритет вопросам и важным утверждениям
      if (
        trimmed.includes('?') ||
        trimmed.toLowerCase().includes('важно') ||
        trimmed.toLowerCase().includes('нужно') ||
        trimmed.toLowerCase().includes('требуется') ||
        trimmed.length > 50
      ) {
        keyPoints.push(trimmed);
      }
    }

    // Ограничивает количество ключевых точек
    if (keyPoints.length >= 10) {
      break;
    }
  }

  return keyPoints.join('. ') + (keyPoints.length > 0 ? '.' : '');
}

/**
 * Суммирует длинный контекст чата при превышении лимитов.
 * Сохраняет последние сообщения и суммирует остальные.
 *
 * @param context - Исходный контекст чата.
 * @param maxTokens - Максимальное количество токенов.
 * @param preserveRecent - Количество последних сообщений для сохранения.
 * @returns Результат суммирования.
 */
export function summarizeContext(
  context: ChatContext,
  maxTokens: number,
  preserveRecent: number = 5
): ChatContextResult<SummarizationResult> {
  try {
    const totalTokens = calculateChatContextTokens(context);

    // Если контекст помещается в лимиты, возвращает как есть
    if (totalTokens <= maxTokens) {
      return {
        success: true,
        data: {
          summary: '',
          summarizedMessagesCount: 0,
          preservedMessages: context.messages,
        },
      };
    }

    const messages = [...context.messages];
    const preservedMessages: ChatMessage[] = [];
    const messagesToSummarize: ChatMessage[] = [];

    // Сохраняет последние сообщения
    const recentCount = Math.min(preserveRecent, messages.length);
    for (let i = messages.length - recentCount; i < messages.length; i++) {
      preservedMessages.push(messages[i]);
    }

    // Остальные сообщения для суммирования
    for (let i = 0; i < messages.length - recentCount; i++) {
      messagesToSummarize.push(messages[i]);
    }

    if (messagesToSummarize.length === 0) {
      return {
        success: true,
        data: {
          summary: '',
          summarizedMessagesCount: 0,
          preservedMessages,
        },
      };
    }

    // Извлекает ключевую информацию
    const keyInformation = extractKeyInformation(messagesToSummarize);

    // Создает краткое резюме
    const summary = `Предыдущий контекст чата (${messagesToSummarize.length} сообщений): ${keyInformation}`;

    return {
      success: true,
      data: {
        summary,
        summarizedMessagesCount: messagesToSummarize.length,
        preservedMessages,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown summarization error',
    };
  }
}

/**
 * Обрезает контекст чата с сохранением важных сообщений.
 * Удаляет старые сообщения, начиная с самых ранних.
 *
 * @param context - Контекст чата.
 * @param maxMessages - Максимальное количество сообщений.
 * @returns Обновленный контекст.
 */
export function truncateContext(
  context: ChatContext,
  maxMessages: number
): ChatContext {
  if (!context.messages || context.messages.length <= maxMessages) {
    return context;
  }

  const messages = [...context.messages];
  const truncatedMessages = messages.slice(-maxMessages);

  return {
    ...context,
    messages: truncatedMessages,
  };
}

/**
 * Форматирует сообщения для различных провайдеров LLM.
 * Адаптирует формат сообщений под специфику каждого провайдера.
 *
 * @param messages - Массив сообщений.
 * @param provider - Название провайдера.
 * @returns Отформатированные сообщения.
 */
export function formatMessagesForProvider(
  messages: ChatMessage[],
  provider: string = 'Ollama'
): string {
  if (!messages || messages.length === 0) {
    return '';
  }

  switch (provider.toLowerCase()) {
    case 'anthropic':
      // Anthropic использует специальный формат с ролями
      return messages
        .map((msg) => {
          const role = msg.role === 'assistant' ? 'Assistant' : 'Human';
          return `${role}: ${msg.content}`;
        })
        .join('\n\n');

    case 'openrouter':
    case 'openai':
      // OpenAI/OpenRouter используют JSON формат
      return JSON.stringify(
        messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      );

    case 'ollama':
    case 'embedded ollama':
    default:
      // Ollama использует простой текстовый формат
      return messages
        .map((msg) => {
          const rolePrefix =
            msg.role === 'user'
              ? 'Пользователь'
              : msg.role === 'assistant'
                ? 'Ассистент'
                : 'Система';
          return `${rolePrefix}: ${msg.content}`;
        })
        .join('\n\n');
  }
}

/**
 * Валидирует контекст чата на корректность.
 *
 * @param context - Контекст для валидации.
 * @returns Результат валидации.
 */
export function validateChatContext(
  context: ChatContext
): ChatContextResult<ChatContext> {
  try {
    // Проверяет базовую структуру
    if (!context || typeof context !== 'object') {
      return {
        success: false,
        error: 'Context must be an object',
      };
    }

    // Проверяет массив сообщений
    if (!Array.isArray(context.messages)) {
      return {
        success: false,
        error: 'Messages must be an array',
      };
    }

    // Валидирует каждое сообщение
    for (let i = 0; i < context.messages.length; i++) {
      const message = context.messages[i];

      if (!message || typeof message !== 'object') {
        return {
          success: false,
          error: `Message at index ${i} must be an object`,
        };
      }

      if (!message.id || typeof message.id !== 'string') {
        return {
          success: false,
          error: `Message at index ${i} must have a valid id`,
        };
      }

      if (
        !message.role ||
        !['user', 'assistant', 'system'].includes(message.role)
      ) {
        return {
          success: false,
          error: `Message at index ${i} must have a valid role`,
        };
      }

      if (typeof message.content !== 'string') {
        return {
          success: false,
          error: `Message at index ${i} must have string content`,
        };
      }

      if (!message.timestamp || typeof message.timestamp !== 'string') {
        return {
          success: false,
          error: `Message at index ${i} must have a valid timestamp`,
        };
      }
    }

    return {
      success: true,
      data: context,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Получает обработанный контекст из кэша или обрабатывает его заново.
 *
 * @param context - Исходный контекст.
 * @param config - Конфигурация обработки.
 * @returns Обработанный контекст.
 */
export function getCachedProcessedContext(
  context: ChatContext,
  config: ChatPromptConfig = {}
): ChatContextResult<ChatContext> {
  try {
    // Очищает устаревший кэш
    cleanupCache();

    // Генерирует ключ кэша
    const cacheKey = generateContextHash(context);

    // Проверяет кэш
    const cached = contextCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return {
        success: true,
        data: cached.context,
      };
    }

    // Обрабатывает контекст
    const processedContext = processChatContext(context, config);

    if (!processedContext.success) {
      return processedContext;
    }

    // Сохраняет в кэш
    contextCache.set(cacheKey, {
      key: cacheKey,
      context: processedContext.data,
      timestamp: Date.now(),
      ttl: DEFAULT_CACHE_TTL,
    });

    return processedContext;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown caching error',
    };
  }
}

/**
 * Обрабатывает контекст чата согласно конфигурации.
 * Применяет суммирование, обрезку и валидацию.
 *
 * @param context - Исходный контекст.
 * @param config - Конфигурация обработки.
 * @returns Обработанный контекст.
 */
export function processChatContext(
  context: ChatContext,
  config: ChatPromptConfig = {}
): ChatContextResult<ChatContext> {
  try {
    // Валидирует исходный контекст
    const validation = validateChatContext(context);
    if (!validation.success) {
      return validation;
    }

    let processedContext = validation.data;

    // Получает лимиты провайдера
    const providerLimits = getProviderTokenLimits(config.provider);
    const maxTokens =
      config.maxContextTokens || providerLimits.maxContextTokens;
    const maxMessages =
      config.preserveRecentMessages || providerLimits.maxMessages || 50;

    // Обрезает по количеству сообщений
    if (processedContext.messages.length > maxMessages) {
      processedContext = truncateContext(processedContext, maxMessages);
    }

    // Проверяет лимиты токенов
    const currentTokens = calculateChatContextTokens(processedContext);

    if (currentTokens > maxTokens && config.enableSummarization !== false) {
      // Применяет суммирование
      const summarization = summarizeContext(
        processedContext,
        maxTokens,
        config.preserveRecentMessages || 5
      );

      if (!summarization.success) {
        return {
          success: false,
          error: `Summarization failed: ${summarization.error}`,
        };
      }

      const { summary, preservedMessages } = summarization.data;

      // Создает новый контекст с суммированием
      const summaryMessage: ChatMessage = {
        id: `summary-${Date.now()}`,
        role: 'system',
        content: summary,
        timestamp: new Date().toISOString(),
      };

      processedContext = {
        ...processedContext,
        messages: [summaryMessage, ...preservedMessages],
      };
    }

    return {
      success: true,
      data: processedContext,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown processing error',
    };
  }
}

/**
 * Строит промпт для чата с учетом истории сообщений и контекста.
 * Основная функция для подготовки контекста к отправке в LLM.
 *
 * @param context - Контекст чата.
 * @param config - Конфигурация построения промпта.
 * @returns Построенный промпт.
 */
export function buildChatPrompt(
  context: ChatContext,
  config: ChatPromptConfig = {}
): ChatContextResult<string> {
  try {
    // Получает обработанный контекст (с кэшированием)
    const processedContext = getCachedProcessedContext(context, config);

    if (!processedContext.success) {
      return processedContext;
    }

    const { data: processed } = processedContext;

    // Получает конфигурацию провайдера
    const provider = config.provider || 'Ollama';
    const providerLimits = getProviderTokenLimits(provider);

    // Форматирует сообщения для провайдера
    const formattedMessages = formatMessagesForProvider(
      processed.messages,
      provider
    );

    // Строит финальный промпт
    let prompt = '';

    // Добавляет системный промпт
    const systemPrompt =
      config.systemPrompt ||
      processed.systemPrompt ||
      'Ты полезный ассистент. Отвечай на вопросы пользователя, используя контекст предыдущих сообщений.';

    if (systemPrompt) {
      prompt += `Система: ${systemPrompt}\n\n`;
    }

    // Добавляет историю сообщений
    if (formattedMessages) {
      prompt += `История сообщений:\n${formattedMessages}\n\n`;
    }

    // Добавляет инструкцию для продолжения диалога
    prompt += 'Продолжи диалог, отвечая на последнее сообщение пользователя.';

    return {
      success: true,
      data: prompt,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown prompt building error',
    };
  }
}

/**
 * Очищает кэш контекста.
 * Используется для освобождения памяти.
 */
export function clearContextCache(): void {
  contextCache.clear();
}

/**
 * Получает статистику кэша контекста.
 *
 * @returns Статистика кэша.
 */
export function getContextCacheStats(): {
  size: number;
  keys: string[];
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  const entries = Array.from(contextCache.values());

  if (entries.length === 0) {
    return {
      size: 0,
      keys: [],
      oldestEntry: null,
      newestEntry: null,
    };
  }

  const timestamps = entries.map((entry) => entry.timestamp);

  return {
    size: contextCache.size,
    keys: Array.from(contextCache.keys()),
    oldestEntry: Math.min(...timestamps),
    newestEntry: Math.max(...timestamps),
  };
}
