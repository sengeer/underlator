export default function separateContentOfModel(processedContent: string) {
  // Разделение контента на размышления и основной ответ
  const thinkingParts = [];
  const mainContentParts = [];

  // Извлечение всех блоков <think>
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  let lastIndex = 0;
  let match;

  while ((match = thinkRegex.exec(processedContent)) !== null) {
    if (match.index > lastIndex) {
      const beforeThink = processedContent.slice(lastIndex, match.index).trim();
      if (beforeThink) {
        mainContentParts.push(beforeThink);
      }
    }

    // Добавление размышления
    thinkingParts.push(match[1].trim());
    lastIndex = match.index + match[0].length;
  }

  // Добавление оставшегося контента после последнего блока размышлений
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
