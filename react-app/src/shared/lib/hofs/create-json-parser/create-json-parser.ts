import { parseJsonLine } from '../../utils/safe-json-parser';

/**
 * HOF для создания парсера JSON строк с обработкой ошибок
 *
 * @description Высокоуровневая HOF функция для создания парсера JSON строк с опциональной обработкой ошибок.
 * Используется для безопасного парсинга потоковых JSON данных от LLM провайдеров (например, Ollama).
 * Позволяет обрабатывать ошибки парсинга без прерывания основного потока выполнения.
 *
 * @template T - Тип данных, которые ожидаются в результате парсинга
 * @param onError - Обработчик ошибок парсинга, вызывается при неудачном парсинге строки
 * @returns Функция парсера, принимающая JSON строку и возвращающая типизированный результат
 *
 * @example
 * Базовое использование без обработки ошибок
 * const parser = createJsonParser<{ message: string }>();
 * const result = parser('{"message": "Hello"}');
 * if (result.success) {
 *   console.log(result.data.message); // "Hello"
 * }
 *
 * @example
 * Использование с обработкой ошибок
 * const parser = createJsonParser<{ response: string }>({
 *   onError: (error, line) => {
 *     console.error(`JSON parsing failed: ${error}`, line);
 *   }
 * });
 *
 * const result = parser('invalid json');
 * Ошибка будет залогирована через onError
 *
 * @example
 * Использование в потоковой обработке данных
 * const parser = createJsonParser<OllamaResponse>();
 *
 * stream.on('data', (chunk: string) => {
 *   const lines = chunk.split('\n');
 *   lines.forEach(line => {
 *     const result = parser(line);
 *     if (result.success) {
 *       handleResponse(result.data);
 *     }
 *   });
 * });
 */
export const createJsonParser =
  <T = any>(onError?: (error: string, line: string) => void) =>
  (line: string): ParseResult<T> => {
    const result = parseJsonLine<T>(line);

    // Вызов обработчика ошибок при неудачном парсинге
    // Это позволяет логировать ошибки без прерывания основного потока
    if (!result.success && onError) {
      onError(result.error, line);
    }

    return result;
  };

export default createJsonParser;
