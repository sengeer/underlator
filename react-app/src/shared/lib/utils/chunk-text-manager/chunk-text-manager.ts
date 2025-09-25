import { CHUNK_DELIMITER } from '../../constants';
import createContextualPrompt from '../../hofs/create-contextual-prompt';
import { ChunkOperationResult } from './types/chunk-text-manager';

/**
 * @module ChunkTextManager
 * @description Утилита для управления текстовыми фрагментами в контекстном переводе
 * Обеспечивает объединение, разделение и обработку текстовых фрагментов для работы с LLM
 */

/**
 * Объединяет массив текстовых фрагментов в единую строку с использованием разделителя
 *
 * @description Чистая функция для объединения текстовых фрагментов с разделителем CHUNK_DELIMITER.
 * Фильтрует пустые и невалидные фрагменты, обеспечивая корректное формирование контекста для LLM.
 * Используется в контекстном переводе для передачи множественных текстовых фрагментов в одном запросе.
 *
 * @param {string[]} chunks - Массив текстовых фрагментов для объединения
 * @returns {ChunkOperationResult<string>} Результат операции с объединенным текстом или ошибкой
 *
 * @example
 * Базовое использование
 * const result = combineChunks(['Привет', 'мир', '!']);
 * if (result.success) {
 *   console.log(result.data); // 'Приветмир!'
 * }
 *
 * @example
 * Обработка ошибок
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

  // Обработка пустого массива - возвращаем пустую строку
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
 * Разделяет объединенный текст обратно на массив фрагментов
 *
 * @description Чистая функция для разделения текста, объединенного с помощью CHUNK_DELIMITER,
 * обратно на массив отдельных фрагментов. Удаляет пустые строки и обрезает пробелы.
 * Используется для обработки ответов от LLM в контекстном переводе.
 *
 * @param {string} combinedText - Объединенный текст с разделителями
 * @returns {ChunkOperationResult<string[]>} Результат операции с массивом фрагментов или ошибкой
 *
 * @example
 * Базовое использование
 * const result = splitCombinedText('Приветмир!');
 * if (result.success) {
 *   console.log(result.data); // ['Привет', 'мир', '!']
 * }
 *
 * @example
 * Обработка пустого текста
 * const result = splitCombinedText('');
 * if (result.success) {
 *   console.log(result.data); // []
 * }
 */
export function splitCombinedText(
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
 * Преобразует массив строк в объект с числовыми ключами
 *
 * @description Утилитарная функция для преобразования массива текстовых фрагментов
 * в объект формата Record<number, string>. Используется для создания структуры данных,
 * удобной для обновления отдельных фрагментов в UI компонентах.
 *
 * @param {string[]} chunks - Массив текстовых фрагментов
 * @returns {Record<number, string>} Объект с числовыми ключами и строковыми значениями
 *
 * @example
 * Базовое использование
 * const record = convertArrayToRecord(['Привет', 'мир', '!']);
 * console.log(record); // { 0: 'Привет', 1: 'мир', 2: '!' }
 *
 * @example
 * Использование в UI обновлениях
 * const chunks = ['Фрагмент 1', 'Фрагмент 2'];
 * const record = convertArrayToRecord(chunks);
 * // record[0] можно использовать для обновления первого элемента
 */
export function convertArrayToRecord(chunks: string[]): Record<number, string> {
  const result: Record<number, string> = {};
  // Преобразование массива в объект с индексами в качестве ключей
  for (let i = 0; i < chunks.length; i++) {
    result[i] = chunks[i];
  }
  return result;
}

/**
 * Подготавливает данные для контекстного перевода
 *
 * @description Композитная функция, объединяющая текстовые фрагменты и создающая промпт
 * для контекстного перевода. Использует createContextualPrompt для генерации промпта
 * с учетом исходного и целевого языков. Обеспечивает полную подготовку данных для LLM.
 *
 * @param {string[]} chunks - Массив текстовых фрагментов для перевода
 * @param {string} sourceLanguage - Исходный язык (например, 'ru')
 * @param {string} targetLanguage - Целевой язык (например, 'en')
 * @returns {ChunkOperationResult<{combinedText: string; prompt: string}>} Результат с объединенным текстом и промптом
 *
 * @example
 * Подготовка перевода с русского на английский
 * const result = prepareContextualTranslation(
 *   ['Привет мир', 'Как дела?'],
 *   'ru',
 *   'en'
 * );
 * if (result.success) {
 *   console.log(result.data.prompt); // Промпт для перевода
 *   console.log(result.data.combinedText); // 'Привет мирКак дела?'
 * }
 *
 * @example
 * Обработка ошибок подготовки
 * const result = prepareContextualTranslation([], 'ru', 'en');
 * if (!result.success) {
 *   console.error(result.error); // Сообщение об ошибке
 * }
 */
export function prepareContextualTranslation(
  chunks: string[],
  sourceLanguage: string,
  targetLanguage: string
): ChunkOperationResult<{ combinedText: string; prompt: string }> {
  // Объединение фрагментов в единый контекст
  const combineResult = combineChunks(chunks);

  // Ранний возврат при ошибке объединения
  if (!combineResult.success) {
    return combineResult;
  }

  // Создание функции-билдера промпта для конкретных языков
  const promptBuilder = createContextualPrompt(sourceLanguage, targetLanguage);

  // Генерация финального промпта с объединенным текстом
  const prompt = promptBuilder(combineResult.data);

  return {
    success: true,
    data: {
      combinedText: combineResult.data,
      prompt,
    },
  };
}

/**
 * Обрабатывает ответ контекстного перевода с поддержкой частичных результатов
 *
 * @description Чистая функция для обработки ответа от LLM в контекстном переводе.
 * Разделяет переведенный текст на фрагменты и преобразует в формат Record<number, string>.
 * Обрабатывает случаи, когда модель возвращает больше или меньше фрагментов, чем ожидалось.
 * Поддерживает частичные результаты для инкрементального обновления UI.
 *
 * @param {string} translatedText - Переведенный текст от LLM
 * @param {number} originalChunksCount - Количество исходных фрагментов
 * @returns {ChunkOperationResult<Record<number, string>>} Результат с обработанными фрагментами
 *
 * @example
 * Обработка корректного ответа
 * const result = processContextualResponse(
 *   'Hello worldHow are you?',
 *   2
 * );
 * if (result.success) {
 *   console.log(result.data); // { 0: 'Hello world', 1: 'How are you?' }
 * }
 *
 * @example
 * Обработка ответа с лишними фрагментами
 * const result = processContextualResponse(
 *   'HelloworldHowareyou?',
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
  // Обработка пустого ответа - возвращаем пустые фрагменты
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
      `⚠️ Expected ${originalChunksCount} chunks, but got ${chunks.length}. ` +
        'Combining extra chunks into the last one'
    );

    // Объединение лишних фрагментов в последний ожидаемый фрагмент
    const correctedChunks = chunks.slice(0, originalChunksCount - 1);
    const lastChunk = chunks.slice(originalChunksCount - 1).join(' ');
    correctedChunks.push(lastChunk);

    const record = convertArrayToRecord(correctedChunks);
    return { success: true, data: record };
  }

  // Идеальное соответствие количества фрагментов
  const record = convertArrayToRecord(chunks);
  return { success: true, data: record };
}
