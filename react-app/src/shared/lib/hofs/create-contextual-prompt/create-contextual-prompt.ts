import { CHUNK_DELIMITER } from '../../constants';

/**
 * HOF для генерации промпта контекстного перевода
 *
 * @description Высокоуровневая HOF функция для создания специализированного промпта
 * для контекстного перевода. Функция возвращает другую функцию, которая
 * принимает объединенный текст и генерирует структурированный промпт для LLM.
 *
 * Ключевая особенность - строгое сохранение разделителей (CHUNK_DELIMITER)
 * для обеспечения целостности структуры документа при переводе. Это критически важно
 * для работы с PDF документами, где необходимо сохранить разбиение на чанки.
 *
 * @param {string} sourceLanguage - Исходный язык документа (например 'en')
 * @param {string} targetLanguage - Целевой язык перевода (например 'ru')
 * @returns {function} Функция, принимающая объединенный текст и возвращающая промпт
 *
 * @example
 * Базовое использование для перевода с английского на русский
 * const promptBuilder = createContextualPrompt('en', 'ru');
 */
export const createContextualPrompt =
  (sourceLanguage: string, targetLanguage: string) =>
  (combinedText: string): string => {
    // Генерация структурированного промпта с четкими инструкциями
    // Использование специального разделителя CHUNK_DELIMITER
    // обеспечивает уникальность маркера, который не встречается в обычном тексте
    const systemContextualPrompt = `
  [ROLE]
  You are a professional document translation engine.
  Your task is to translate technical/academic content while preserving ALL special markers.

  [RULES]
  1. STRICTLY preserve every occurrence of "${CHUNK_DELIMITER}" unchanged
  2. NEVER translate, modify, move, add or delete delimiter symbols
  3. Treat delimiters as INVIOABLE technical markers, not linguistic elements
  4. Maintain original spacing around delimiters exactly
  5. Translate text segments BETWEEN delimiters independently
  6. For incomplete sentences at segment boundaries:
    - Keep grammatical consistency with adjacent chunks
    - Preserve technical terms and proper names unchanged
  7. Output ONLY the translated text with preserved markers

  [CONTEXT]
  - Document type: 'PDF'
  - Source language: ${sourceLanguage}
  - Target language: ${targetLanguage}

  [EXAMPLE]
  Input: "Important${CHUNK_DELIMITER}safety${CHUNK_DELIMITER}information"
  Output: "Важная${CHUNK_DELIMITER}информация${CHUNK_DELIMITER}по безопасности"

  [INPUT TEXT]
  ${combinedText}

  [TRANSLATION]
  `;

    return systemContextualPrompt;
  };

export default createContextualPrompt;
