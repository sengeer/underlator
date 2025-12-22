/**
 * @module ChatHandlersIndex
 * Индексный файл для chat handlers.
 */

export { validateChatRequest } from './chat-validator';
export { loadRagContext } from './chat-rag-loader';
export { loadChatContext } from './chat-context-loader';
export { buildChatPromptWithContext } from './chat-prompt-builder';
export {
  accumulateResponse,
  createStreamingHandler,
  handleStreamingChunk,
} from './chat-response-handler';
export { saveChatHistory } from './chat-history-saver';
export type {
  ChatValidationResult,
  RAGContextResult,
  ChatContextResult,
  ChatPromptResult,
  StreamingResponseHandler,
  ChatHistoryResult,
  ChatHistorySaveConfig,
} from './types/chat-handlers';
