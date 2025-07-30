export default function processThinkTags(modelContent: string): string {
  // Check for presence
  if (!modelContent) return modelContent;

  // Processing of unclosed tags <think>
  let processedContent = modelContent;

  const openThinkRegex = /<think>/g;
  const closeThinkRegex = /<\/think>/g;

  const openMatches = [...processedContent.matchAll(openThinkRegex)];
  const closeMatches = [...processedContent.matchAll(closeThinkRegex)];

  // Closing tags
  if (openMatches.length > closeMatches.length) {
    // Search for the last opening tag, without the closing one
    const lastOpenIndex = openMatches[openMatches.length - 1].index;
    const hasCloseAfterLastOpen = closeMatches.some(
      (match) =>
        match.index &&
        lastOpenIndex !== undefined &&
        match.index > lastOpenIndex
    );

    // Adding a closing tag if not present
    if (!hasCloseAfterLastOpen) {
      processedContent += '</think>';
    }
  }

  // Processing of all <think> tags, keeping their contents as is
  processedContent = processedContent.replace(
    /<think>([\s\S]*?)<\/think>/g,
    '<think>$1</think>'
  );

  return processedContent;
}
