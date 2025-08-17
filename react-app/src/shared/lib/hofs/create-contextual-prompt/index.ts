import { CHUNK_DELIMITER } from '../../constants';

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

export default createContextualPrompt;
