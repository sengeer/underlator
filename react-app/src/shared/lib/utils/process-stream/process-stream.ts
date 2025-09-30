/**
 * @module ProcessStream
 * Утилита для обработки streaming потоков данных.
 * Предоставляет низкоуровневую функцию для чтения и декодирования потоков.
 * Используется для обработки streaming ответов от LLM провайдеров.
 */

/**
 * Обрабатывает streaming поток данных.
 * Читает поток по частям, декодирует байты в текст и передает чанки в обработчик.
 * Обеспечивает корректную обработку UTF-8 текста и управление потоком чтения.
 *
 * @param reader - Читатель потока данных для обработки.
 * @param processChunk - Функция обработки каждого декодированного чанка.
 * @param decoder - Опциональный декодер текста (по умолчанию TextDecoder).
 * @returns Promise, который завершается после обработки всего потока.
 *
 * @example
 * // Обработка streaming ответа от Ollama API
 * const reader = response.body?.getReader();
 * await processStream(reader, (chunk) => {
 *   console.log('Received chunk:', chunk);
 * });
 */
async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>> | undefined,
  processChunk: (chunk: string) => void,
  decoder?: TextDecoder
): Promise<void> {
  // Ранний выход при отсутствии читателя
  // Предотвращает ошибки при работе с пустыми потоками
  if (!reader) return;

  // Использование переданного декодера или создание нового
  // Обеспечивает гибкость в настройке декодирования
  const decoderInstance = decoder || new TextDecoder();

  // Основной цикл чтения потока
  // Читает данные до завершения потока (done === true)
  while (true) {
    const { done, value } = await reader.read();

    // Завершение обработки при окончании потока
    if (done) break;

    // Декодирование байтов в UTF-8 текст
    // Преобразует бинарные данные в читаемый текст
    const chunk = decoderInstance.decode(value);

    // Передача декодированного чанка в обработчик
    // Позволяет внешнему коду обрабатывать данные по мере поступления
    processChunk(chunk);
  }
}

export default processStream;
