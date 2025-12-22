/**
 * @module ChunkTextManager
 * Утилита для управления текстовыми фрагментами в контекстном переводе.
 * Обеспечивает объединение, разделение и обработку текстовых фрагментов для работы с LLM.
 * Используется в провайдерах для подготовки данных к контекстному переводу и обработки ответов.
 */

import { CHUNK_DELIMITER } from '../../constants';
import { promptManager } from '../../utils/prompt-manager';
import { ChunkOperationResult } from './types/chunk-text-manager';

/**
 * Объединяет массив текстовых фрагментов в единую строку с использованием разделителя.
 *
 * Чистая функция для объединения текстовых фрагментов с разделителем CHUNK_DELIMITER.
 * Фильтрует пустые и невалидные фрагменты, обеспечивая корректное формирование контекста для LLM.
 * Используется в контекстном переводе для передачи множественных текстовых фрагментов в одном запросе.
 *
 * @param chunks - Массив текстовых фрагментов для объединения.
 * @returns Результат операции с объединенным текстом или ошибкой.
 *
 * @example
 * // Базовое использование
 * const result = combineChunks(['Привет', 'мир', '!']);
 * if (result.success) {
 *   console.log(result.data); // 'Приветмир!'
 * }
 *
 * @example
 * // Обработка ошибок
 * const result = combineChunks([]);
 * if (!result.success) {
 *   console.error(result.error); // 'All chunks are empty or invalid'
 * }
 */
export function combineChunks(chunks: string[]): ChunkOperationResult<string> {
  // Валидация входных данных для предотвращения runtime ошибок
  if (!Array.isArray(chunks)) {
    return { success: false, error: 'Input must be an array' };
  }

  // Обработка пустого массива - возвращается пустая строка для валидного результата
  if (chunks.length === 0) {
    return { success: true, data: '' };
  }

  // Фильтрация невалидных фрагментов для обеспечения качества данных
  const filteredChunks = chunks.filter((chunk) => typeof chunk === 'string');

  // Проверка наличия валидных фрагментов после фильтрации
  if (filteredChunks.length === 0) {
    return { success: false, error: 'All chunks are empty or invalid' };
  }

  // Объединение фрагментов с использованием специального разделителя
  const combinedText = filteredChunks.join(CHUNK_DELIMITER);
  return { success: true, data: combinedText };
}

/**
 * Разделяет объединенный текст обратно на массив фрагментов.
 *
 * Чистая функция для разделения текста, объединенного с помощью CHUNK_DELIMITER,
 * обратно на массив отдельных фрагментов. Удаляет пустые строки и обрезает пробелы.
 * Используется для обработки ответов от LLM в контекстном переводе.
 *
 * @param combinedText - Объединенный текст с разделителями.
 * @returns Результат операции с массивом фрагментов или ошибкой.
 *
 * @example
 * // Базовое использование
 * const result = splitCombinedText('Приветмир!');
 * if (result.success) {
 *   console.log(result.data); // ['Привет', 'мир', '!']
 * }
 *
 * @example
 * // Обработка пустого текста
 * const result = splitCombinedText('');
 * if (result.success) {
 *   console.log(result.data); // []
 * }
 */
function splitCombinedText(
  combinedText: string
): ChunkOperationResult<string[]> {
  // Валидация типа входных данных
  if (typeof combinedText !== 'string') {
    return { success: false, error: 'Input must be a string' };
  }

  // Обработка пустого или состоящего только из пробелов текста
  if (combinedText.trim().length === 0) {
    return { success: true, data: [] };
  }

  // Разделение по разделителю с очисткой и фильтрацией
  const chunks = combinedText
    .split(CHUNK_DELIMITER)
    .map((chunk) => chunk.trim()) // Удаление лишних пробелов
    .filter((chunk) => chunk.length > 0); // Исключение пустых фрагментов

  return { success: true, data: chunks };
}

/**
 * Преобразует массив строк в объект с числовыми ключами.
 *
 * Утилитарная функция для преобразования массива текстовых фрагментов
 * в объект формата Record<number, string>. Используется для создания структуры данных,
 * удобной для обновления отдельных фрагментов в UI компонентах.
 * Оптимизирована с использованием reduce для улучшения читаемости.
 *
 * Сложность: O(n) где n - количество фрагментов
 *
 * @param chunks - Массив текстовых фрагментов.
 * @returns Объект с числовыми ключами и строковыми значениями.
 *
 * @example
 * // Базовое использование
 * const record = convertArrayToRecord(['Привет', 'мир', '!']);
 * console.log(record); // { 0: 'Привет', 1: 'мир', 2: '!' }
 *
 * @example
 * // Использование в UI обновлениях
 * const chunks = ['Фрагмент 1', 'Фрагмент 2'];
 * const record = convertArrayToRecord(chunks);
 * // record[0] можно использовать для обновления первого элемента
 */
function convertArrayToRecord(chunks: string[]): Record<number, string> {
  return chunks.reduce(
    (acc: Record<number, string>, chunk: string, index: number) => {
      acc[index] = chunk;
      return acc;
    },
    {}
  );
}

/**
 * Обрабатывает ответ контекстного перевода с поддержкой частичных результатов.
 *
 * Чистая функция для обработки ответа от LLM в контекстном переводе.
 * Разделяет переведенный текст на фрагменты и преобразует в формат Record<number, string>.
 * Обрабатывает случаи, когда модель возвращает больше или меньше фрагментов, чем ожидалось.
 * Поддерживает частичные результаты для инкрементального обновления UI.
 *
 * @param translatedText - Переведенный текст от LLM.
 * @param originalChunksCount - Количество исходных фрагментов.
 * @returns Результат с обработанными фрагментами.
 *
 * @example
 * // Обработка корректного ответа
 * const result = processContextualResponse(
 *   'Hello worldHow are you?',
 *   2
 * );
 * if (result.success) {
 *   console.log(result.data); // { 0: 'Hello world', 1: 'How are you?' }
 * }
 *
 * @example
 * // Обработка ответа с лишними фрагментами
 * const result = processContextualResponse(
 *   'HelloworldHowareyou?',
 *   2
 * );
 * if (result.success) {
 *   console.log(result.data); // { 0: 'Hello', 1: 'world How are you?' }
 * }
 */
export function processContextualResponse(
  translatedText: string,
  originalChunksCount: number
): ChunkOperationResult<Record<number, string>> {
  // Обработка пустого ответа - возвращаются пустые фрагменты
  if (!translatedText.trim()) {
    const data: Record<number, string> = {};

    // Создание пустых фрагментов по количеству исходных
    for (let i = 0; i < originalChunksCount; i++) {
      data[i] = '';
    }

    return { success: true, data };
  }

  // Разделение переведенного текста на фрагменты
  const splitResult = splitCombinedText(translatedText);

  if (!splitResult.success) {
    return splitResult;
  }

  const chunks = splitResult.data;

  // Обработка случая, когда модель вернула больше фрагментов, чем ожидалось
  // Это может произойти, если модель добавила дополнительные разделители
  if (chunks.length > originalChunksCount) {
    console.warn(
      `Expected ${originalChunksCount} chunks, but got ${chunks.length}. ` +
        'Combining extra chunks into the last one'
    );

    // Объединение лишних фрагментов в последний ожидаемый фрагмент
    // Оптимизировано: используем slice один раз
    const preservedChunks = chunks.slice(0, originalChunksCount - 1);
    const remainingChunks = chunks.slice(originalChunksCount - 1);
    const lastChunk = remainingChunks.join(' ');
    preservedChunks.push(lastChunk);

    const record = convertArrayToRecord(preservedChunks);
    return { success: true, data: record };
  }

  // Обработка случая, когда модель вернула меньше фрагментов, чем ожидалось
  // Заполняет недостающие фрагменты пустыми строками
  if (chunks.length < originalChunksCount) {
    console.warn(
      `Expected ${originalChunksCount} chunks, but got ${chunks.length}. ` +
        'Filling missing chunks with empty strings'
    );

    const record = convertArrayToRecord(chunks);

    // Добавляет недостающие фрагменты
    for (let i = chunks.length; i < originalChunksCount; i++) {
      record[i] = '';
    }

    return { success: true, data: record };
  }

  // Идеальное соответствие количества фрагментов
  const record = convertArrayToRecord(chunks);
  return { success: true, data: record };
}
