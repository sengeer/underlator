import createJsonParser from '../../hofs/create-json-parser';

// Utility for safe JSON parsing with stream data processing

// Pure function for parsing a single JSON string
export function parseJsonLine<T = any>(line: string): ParseResult<T> {
  const trimmedLine = line.trim();

  if (!trimmedLine) {
    return { success: false, error: 'Empty line' };
  }

  try {
    const data = JSON.parse(trimmedLine);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

// Function composition for processing a buffer with JSON strings
export function processJsonBuffer<T = any>(
  buffer: string,
  processor: (data: T) => void,
  onError?: (error: string, line: string) => void
): string {
  const lines = buffer.split('\n');
  const remainingBuffer = lines.pop() || '';

  const parser = createJsonParser<T>(onError);

  lines.forEach((line) => {
    const result = parser(line);
    if (result.success) {
      processor(result.data);
    }
  });

  return remainingBuffer;
}

// Curried function for creating a chunk handler
export function createChunkProcessor<T = any>(
  onData: (data: T) => void,
  onError?: (error: string, line: string) => void
) {
  let buffer = '';

  return (chunk: string): void => {
    buffer += chunk;
    buffer = processJsonBuffer(buffer, onData, onError);
  };
}

// Partial application for creating a specialized Ollama parser
export function createOllamaChunkProcessor(
  onChunk: (response: string) => void,
  onError?: (error: string, line: string) => void
) {
  const processData = (data: { response?: string }) => {
    const response = data.response || '';
    if (response) {
      onChunk(response);
    }
  };

  return createChunkProcessor(processData, onError);
}
