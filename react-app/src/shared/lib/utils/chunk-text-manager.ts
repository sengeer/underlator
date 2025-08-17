import { CHUNK_DELIMITER } from '../constants';

// Utility for managing text chunks in contextual translation

// Algebraic type for chunk operation results
export type ChunkOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Combining text chunks with delimiter
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

// Splitting combined text back to chunks
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

// HOF for creating contextual translation prompt with custom instructions
export const createContextualPrompt =
  (
    sourceLanguage: string,
    targetLanguage: string,
    customInstruction?: string
  ) =>
  (combinedText: string): string => {
    const systemContextualPrompt = `
  [ROLE]
  You are a professional document translation engine.
  Your task is to translate technical/academic content while preserving ALL special markers.

  [RULES]
  1. STRICTLY preserve every occurrence of "${CHUNK_DELIMITER}" unchanged
  2. NEVER translate, modify, move, add or delete delimiter symbols
  3. Treat delimiters as INVIOABLE technical markers, not linguistic elements
  4. Maintain original spacing around delimiters exactly
  5. Translate text segments BETWEEN delimiters independently
  6. For incomplete sentences at segment boundaries:
    - Keep grammatical consistency with adjacent chunks
    - Preserve technical terms and proper names unchanged
  7. Output ONLY the translated text with preserved markers

  [CONTEXT]
  - Document type: 'PDF'
  - Source language: ${sourceLanguage}
  - Target language: ${targetLanguage}

  [EXAMPLE]
  Input: "Important${CHUNK_DELIMITER}safety${CHUNK_DELIMITER}information"
  Output: "Важная${CHUNK_DELIMITER}информация${CHUNK_DELIMITER}по безопасности"

  [INPUT TEXT]
  ${combinedText}

  [TRANSLATION]
  `;

    return systemContextualPrompt;
  };

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

// Processing contextual response with partial support
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
      `Expected ${originalChunksCount} chunks, but got ${chunks.length}. ` +
        'Combining extra chunks into the last one.'
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
