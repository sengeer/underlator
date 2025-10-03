/**
 * @module ProcessThinkTags
 * Утилита для обработки тегов <think> в контенте модели.
 * Обеспечивает корректное закрытие незавершенных тегов и нормализацию структуры.
 * Используется в MarkdownRenderer для разделения "размышлений" модели и основного контента.
 */

/**
 * Обрабатывает теги <think> в контенте модели.
 * Автоматически закрывает незавершенные теги и нормализует структуру для последующего парсинга.
 *
 * @param modelContent - Исходный контент с возможными тегами <think>.
 * @returns Обработанный контент с корректно закрытыми тегами.
 *
 * @example
 * const content = "Текст <think>размышления модели";
 * const processed = processThinkTags(content);
 * // Результат: "Текст <think>размышления модели</think>"
 */
export default function processThinkTags(modelContent: string): string {
  // Ранний возврат для пустого контента
  if (!modelContent) return modelContent;

  let processedContent = modelContent;

  // Регулярные выражения для поиска открывающих и закрывающих тегов
  const openThinkRegex = /<think>/g;
  const closeThinkRegex = /<\/think>/g;

  // Поиск всех вхождений тегов в контенте
  const openMatches = [...processedContent.matchAll(openThinkRegex)];
  const closeMatches = [...processedContent.matchAll(closeThinkRegex)];

  // Автоматическое закрытие незавершенных тегов
  if (openMatches.length > closeMatches.length) {
    // Определение последнего открывающего тега без соответствующего закрывающего
    const lastOpenIndex = openMatches[openMatches.length - 1].index;
    const hasCloseAfterLastOpen = closeMatches.some(
      (match) =>
        match.index &&
        lastOpenIndex !== undefined &&
        match.index > lastOpenIndex
    );

    // Добавление закрывающего тега в конец контента
    if (!hasCloseAfterLastOpen) {
      processedContent += '</think>';
    }
  }

  // Нормализация структуры тегов без изменения содержимого
  // Обеспечивает единообразный формат для последующего парсинга
  processedContent = processedContent.replace(
    /<think>([\s\S]*?)<\/think>/g,
    '<think>$1</think>'
  );

  return processedContent;
}
