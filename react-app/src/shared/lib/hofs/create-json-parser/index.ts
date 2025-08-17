import { parseJsonLine } from '../../utils/safe-json-parser';

// HOF for creating a parser with custom error handling
export const createJsonParser =
  <T = any>(onError?: (error: string, line: string) => void) =>
  (line: string): ParseResult<T> => {
    const result = parseJsonLine<T>(line);

    if (!result.success && onError) {
      onError(result.error, line);
    }

    return result;
  };

export default createJsonParser;
