/**
 * Утилита для безопасного парсинга JSON с обработкой потоковых данных
 * Следует принципам функционального программирования
 */

// Алгебраический тип для результата парсинга
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Чистая функция для парсинга одной JSON строки
export function parseJsonLine<T = any>(line: string): ParseResult<T> {
  const trimmedLine = line.trim();

  if (!trimmedLine) {
    return { success: false, error: 'Empty line' };
  }

  try {
    const data = JSON.parse(trimmedLine);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

// HOF для создания парсера с кастомной обработкой ошибок
export const createJsonParser =
  <T = any>(onError?: (error: string, line: string) => void) =>
  (line: string): ParseResult<T> => {
    const result = parseJsonLine<T>(line);

    if (!result.success && onError) {
      onError(result.error, line);
    }

    return result;
  };

// Композиция функций для обработки буфера с JSON строками
export function processJsonBuffer<T = any>(
  buffer: string,
  processor: (data: T) => void,
  onError?: (error: string, line: string) => void
): string {
  const lines = buffer.split('\n');
  const remainingBuffer = lines.pop() || '';

  const parser = createJsonParser<T>(onError);

  lines.forEach((line) => {
    const result = parser(line);
    if (result.success) {
      processor(result.data);
    }
  });

  return remainingBuffer;
}

// Каррированная функция для создания обработчика чанков
export function createChunkProcessor<T = any>(
  onData: (data: T) => void,
  onError?: (error: string, line: string) => void
) {
  let buffer = '';

  return (chunk: string): void => {
    buffer += chunk;
    buffer = processJsonBuffer(buffer, onData, onError);
  };
}

// Частичное применение для создания специализированного парсера Ollama
export function createOllamaChunkProcessor(
  onChunk: (response: string) => void,
  onError?: (error: string, line: string) => void
) {
  const processData = (data: { response?: string }) => {
    const response = data.response || '';
    if (response) {
      onChunk(response);
    }
  };

  return createChunkProcessor(processData, onError);
}
