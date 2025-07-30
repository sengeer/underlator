export default function processThinkTags(modelContent: string): string {
  // Проверка наличия
  if (!modelContent) return modelContent;

  // Обработка незакрытых тегов <think>
  let processedContent = modelContent;

  const openThinkRegex = /<think>/g;
  const closeThinkRegex = /<\/think>/g;

  const openMatches = [...processedContent.matchAll(openThinkRegex)];
  const closeMatches = [...processedContent.matchAll(closeThinkRegex)];

  // Если есть незакрытые теги, закрываем их
  if (openMatches.length > closeMatches.length) {
    // Поиск последнего открывающего тега, без закрывающего
    const lastOpenIndex = openMatches[openMatches.length - 1].index;
    const hasCloseAfterLastOpen = closeMatches.some(
      (match) =>
        match.index &&
        lastOpenIndex !== undefined &&
        match.index > lastOpenIndex
    );

    // Добавление закрывающего тега если нет
    if (!hasCloseAfterLastOpen) {
      processedContent += '</think>';
    }
  }

  // Обработка всех тегов <think>, сохраняя их содержимое как есть
  processedContent = processedContent.replace(
    /<think>([\s\S]*?)<\/think>/g,
    '<think>$1</think>'
  );

  return processedContent;
}
