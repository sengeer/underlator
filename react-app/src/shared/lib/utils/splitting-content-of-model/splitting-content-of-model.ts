/**
 * @module SplittingContentOfModel
 * Утилита для разделения контента модели на "размышления" и основной ответ.
 * Парсит теги <think>...</think> и извлекает содержимое для отдельного отображения.
 * Используется в MarkdownRenderer для разделения внутренних размышлений модели и финального ответа.
 */

import { SplittingResult } from './types/splitting-content-of-model';

/**
 * Разделяет контент модели на размышления и основной ответ.
 * Извлекает содержимое тегов <think>...</think> и разделяет основной контент на части.
 * Обеспечивает корректную обработку множественных тегов и сохранение порядка контента.
 *
 * @param processedContent - Обработанный контент с корректно закрытыми тегами <think>.
 * @returns Объект с разделенными частями контента.
 *
 * @example
 * const content = "Ответ <think>размышления модели</think> Финальный ответ";
 * const result = splittingContentOfModel(content);
 * // Результат: {
 * //   thinkingParts: ["размышления модели"],
 * //   mainContentParts: ["Ответ", "Финальный ответ"]
 * // }
 *
 * @example
 * const content = "Текст без тегов";
 * const result = splittingContentOfModel(content);
 * // Результат: {
 * //   thinkingParts: [],
 * //   mainContentParts: ["Текст без тегов"]
 * // }
 */
export default function splittingContentOfModel(
  processedContent: string
): SplittingResult {
  // Массивы для накопления извлеченных частей
  const thinkingParts: string[] = [];
  const mainContentParts: string[] = [];

  // Регулярное выражение для поиска тегов <think> с содержимым
  // Использует [\s\S]*? для нежадного поиска, включая переносы строк
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  let lastIndex = 0;
  let match;

  // Итерация по всем найденным тегам <think>
  while ((match = thinkRegex.exec(processedContent)) !== null) {
    // Извлечение контента между последним обработанным индексом и текущим тегом
    if (match.index > lastIndex) {
      const beforeThink = processedContent.slice(lastIndex, match.index).trim();
      if (beforeThink) {
        mainContentParts.push(beforeThink);
      }
    }

    // Добавление содержимого тега <think> в массив размышлений
    // trim() удаляет лишние пробелы и переносы строк
    thinkingParts.push(match[1].trim());
    lastIndex = match.index + match[0].length;
  }

  // Обработка оставшегося контента после последнего тега <think>
  if (lastIndex < processedContent.length) {
    const afterThink = processedContent.slice(lastIndex).trim();
    if (afterThink) {
      mainContentParts.push(afterThink);
    }
  }

  return {
    thinkingParts,
    mainContentParts,
  };
}
