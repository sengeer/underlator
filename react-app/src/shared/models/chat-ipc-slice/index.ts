/**
 * @module ChatIpcSliceIndex
 * Индексный файл для экспортов ChatIpcSlice.
 */

export {
  loadChats,
  createChat,
  loadChat,
  updateChat,
  deleteChat,
  addMessage,
  selectChatState,
  selectChatsList,
  selectActiveChat,
  selectChatOperations,
  selectGeneration,
  selectIsChatDeleting,
  selectChatError,
  setActiveChat,
  addMessageLocally,
  updateMessage,
  setGenerationState,
  updateGenerationText,
  clearOperationErrors,
  clearChatError,
  resetGeneration,
  resetState,
} from './chat-ipc-slice';

export { default } from './chat-ipc-slice';
