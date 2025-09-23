import { CHUNK_DELIMITER } from '../constants';
import createContextualPrompt from '../hofs/create-contextual-prompt';

// Utility for managing text chunks in contextual translation

// Algebraic type for chunk operation results
export type ChunkOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Pure function for combining text chunks with delimiter
export function combineChunks(chunks: string[]): ChunkOperationResult<string> {
  if (!Array.isArray(chunks)) {
    return { success: false, error: 'Input must be an array' };
  }

  if (chunks.length === 0) {
    return { success: true, data: '' };
  }

  // Filter out empty chunks and combine with delimiter
  const filteredChunks = chunks.filter((chunk) => typeof chunk === 'string');

  if (filteredChunks.length === 0) {
    return { success: false, error: 'All chunks are empty or invalid' };
  }

  const combinedText = filteredChunks.join(CHUNK_DELIMITER);
  return { success: true, data: combinedText };
}

// Pure function for splitting combined text back to chunks
export function splitCombinedText(
  combinedText: string
): ChunkOperationResult<string[]> {
  if (typeof combinedText !== 'string') {
    return { success: false, error: 'Input must be a string' };
  }

  if (combinedText.trim().length === 0) {
    return { success: true, data: [] };
  }

  // Split by delimiter and filter out empty strings
  const chunks = combinedText
    .split(CHUNK_DELIMITER)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  return { success: true, data: chunks };
}

// Converting array to Record<number, string> format
export function convertArrayToRecord(chunks: string[]): Record<number, string> {
  const result: Record<number, string> = {};
  for (let i = 0; i < chunks.length; i++) {
    result[i] = chunks[i];
  }
  return result;
}

// Composed function for full contextual translation preparation
export function prepareContextualTranslation(
  chunks: string[],
  sourceLanguage: string,
  targetLanguage: string,
  customInstruction?: string
): ChunkOperationResult<{ combinedText: string; prompt: string }> {
  const combineResult = combineChunks(chunks);

  if (!combineResult.success) {
    return combineResult;
  }

  const promptBuilder = createContextualPrompt(
    sourceLanguage,
    targetLanguage,
    customInstruction
  );

  const prompt = promptBuilder(combineResult.data);

  return {
    success: true,
    data: {
      combinedText: combineResult.data,
      prompt,
    },
  };
}

// Pure function for processing contextual translation response with partial support
export function processContextualResponse(
  translatedText: string,
  originalChunksCount: number
): ChunkOperationResult<Record<number, string>> {
  // Early return for empty text
  if (!translatedText.trim()) {
    const data: Record<number, string> = {};

    for (let i = 0; i < originalChunksCount; i++) {
      data[i] = '';
    }

    return { success: true, data };
  }

  const splitResult = splitCombinedText(translatedText);

  if (!splitResult.success) {
    return splitResult;
  }

  const chunks = splitResult.data;

  // Handle extra chunks (model might have added extra delimiters)
  if (chunks.length > originalChunksCount) {
    console.warn(
      `⚠️ Expected ${originalChunksCount} chunks, but got ${chunks.length}. ` +
        'Combining extra chunks into the last one'
    );

    // Combine extra chunks into the last expected chunk
    const correctedChunks = chunks.slice(0, originalChunksCount - 1);
    const lastChunk = chunks.slice(originalChunksCount - 1).join(' ');
    correctedChunks.push(lastChunk);

    const record = convertArrayToRecord(correctedChunks);
    return { success: true, data: record };
  }

  // Perfect match
  const record = convertArrayToRecord(chunks);
  return { success: true, data: record };
}
