/**
 * @module SafeJsonParser
 * Утилиты для безопасного парсинга JSON с обработкой потоковых данных.
 * Предоставляет функциональные утилиты для работы с JSON строками в потоковом режиме.
 * Используется для обработки ответов от LLM провайдеров (Ollama) через streaming API.
 */

import createJsonParser from '../../hofs/create-json-parser';

/**
 * Чистая функция для парсинга одной JSON строки.
 * Безопасно обрабатывает ошибки парсинга и возвращает алгебраический тип результата.
 * Используется как базовая функция для всех остальных парсеров в модуле.
 *
 * @template T - Тип данных, ожидаемых в результате парсинга.
 * @param line - JSON строка для парсинга.
 * @returns Результат парсинга с типом ParseResult<T>.
 *
 * @example
 * const result = parseJsonLine<{ message: string }>('{"message": "Hello"}');
 * if (result.success) {
 *   console.log(result.data.message); // "Hello"
 * } else {
 *   console.error(result.error); // Ошибка парсинга
 * }
 */
export function parseJsonLine<T = any>(line: string): ParseResult<T> {
  const trimmedLine = line.trim();

  // Пустые строки не являются валидным JSON
  if (!trimmedLine) {
    return { success: false, error: 'Empty line' };
  }

  try {
    const data = JSON.parse(trimmedLine);
    return { success: true, data };
  } catch (error) {
    // Безопасная обработка ошибок парсинга без прерывания выполнения
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

/**
 * Функция композиции для обработки буфера с JSON строками.
 * Разбивает буфер на строки, обрабатывает каждую через парсер и возвращает оставшийся буфер.
 * Используется для обработки потоковых данных, где JSON может быть разбит на части.
 *
 * @template T - Тип данных, ожидаемых в результате парсинга.
 * @param buffer - Буфер строк для обработки.
 * @param processor - Функция обработки успешно распарсенных данных.
 * @param onError - Опциональный обработчик ошибок парсинга.
 * @returns Оставшийся буфер (последняя неполная строка).
 *
 * @example
 * let buffer = '';
 * const processor = (data: { response: string }) => {
 *   console.log(data.response);
 * };
 *
 * buffer = processJsonBuffer(buffer, processor, (error, line) => {
 *   console.error('Parse error:', error, line);
 * });
 */
export function processJsonBuffer<T = any>(
  buffer: string,
  processor: (data: T) => void,
  onError?: (error: string, line: string) => void
): string {
  const lines = buffer.split('\n');
  // Последняя строка может быть неполной, сохраняем для следующей итерации
  const remainingBuffer = lines.pop() || '';

  const parser = createJsonParser<T>(onError);

  // Обработка каждой полной строки
  lines.forEach((line) => {
    const result = parser(line);
    if (result.success) {
      processor(result.data);
    }
  });

  return remainingBuffer;
}

/**
 * Каррированная функция для создания обработчика чанков.
 * Создает замыкание с внутренним буфером для накопления данных.
 * Используется для обработки потоковых данных, где JSON может приходить частями.
 *
 * @template T - Тип данных, ожидаемых в результате парсинга.
 * @param onData - Функция обработки успешно распарсенных данных.
 * @param onError - Опциональный обработчик ошибок парсинга.
 * @returns Функция обработчика чанков с внутренним буфером.
 *
 * @example
 * const processChunk = createChunkProcessor<{ response: string }>(
 *   (data) => console.log(data.response),
 *   (error, line) => console.error('Error:', error)
 * );
 *
 * // Использование в потоке
 * stream.on('data', processChunk);
 */
export function createChunkProcessor<T = any>(
  onData: (data: T) => void,
  onError?: (error: string, line: string) => void
) {
  // Внутренний буфер для накопления неполных JSON строк
  let buffer = '';

  return (chunk: string): void => {
    buffer += chunk;
    // Обработка буфера с возвратом оставшейся части
    buffer = processJsonBuffer(buffer, onData, onError);
  };
}

/**
 * Частичное применение для создания специализированного парсера Ollama.
 * Создает обработчик чанков, специфичный для формата ответов Ollama API.
 * Извлекает поле 'response' из JSON объектов и передает его в callback.
 *
 * @param onChunk - Функция обработки извлеченного текста ответа.
 * @param onError - Опциональный обработчик ошибок парсинга.
 * @returns Функция обработчика чанков для Ollama API.
 *
 * @example
 * const processChunk = createOllamaChunkProcessor(
 *   (response) => console.log(response),
 *   (error, line) => console.error('Ollama parse error:', error)
 * );
 *
 * // Использование в провайдере Ollama
 * const reader = response.body?.getReader();
 * await processStream(reader, processChunk);
 */
export function createOllamaChunkProcessor(
  onChunk: (response: string) => void,
  onError?: (error: string, line: string) => void
) {
  // Адаптер для извлечения поля response из Ollama JSON
  const processData = (data: { response?: string }) => {
    const response = data.response || '';
    // Передаем только непустые ответы для предотвращения лишних вызовов
    if (response) {
      onChunk(response);
    }
  };

  return createChunkProcessor(processData, onError);
}
