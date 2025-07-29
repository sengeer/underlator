export default function processThinkTags(content: string): string {
  return content.replace(/<think>([\s\S]*?)<\/think>/g, '<think>$1</think>');
}
