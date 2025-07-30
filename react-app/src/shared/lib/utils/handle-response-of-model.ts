export default function separateContentOfModel(processedContent: string) {
  // Dividing content into thinking and main answer
  const thinkingParts = [];
  const mainContentParts = [];

  // Extracting all blocks <think>
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

    // Adding thinking
    thinkingParts.push(match[1].trim());
    lastIndex = match.index + match[0].length;
  }

  // Adding remaining content after last block of thinking
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
