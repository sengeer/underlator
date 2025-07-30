// Utility for managing DOM text nodes

export interface TextInfo {
  node: Text;
  original: string;
  element: HTMLElement;
}

// Algebraic type for node operation result
export type NodeOperationResult =
  | { success: true; updated: boolean }
  | { success: false; error: string };

// Pure function for creating a Map from TextInfo array
export const createTextInfoMap = (
  textInfos: TextInfo[]
): Map<number, TextInfo> =>
  new Map(textInfos.map((info, index) => [index, info]));

// HOF for creating a node updater with custom logic
export const createNodeUpdater =
  (onError?: (index: number, error: string) => void) =>
  (
    textInfoMap: Map<number, TextInfo>,
    index: number,
    newText: string
  ): NodeOperationResult => {
    const textInfo = textInfoMap.get(index);

    if (!textInfo) {
      const error = `Node at index ${index} not found in textInfos.`;
      if (onError) onError(index, error);
      return { success: false, error };
    }

    if (!textInfo.node) {
      const error = `Text node at index ${index} is null or undefined.`;
      if (onError) onError(index, error);
      return { success: false, error };
    }

    try {
      textInfo.node.nodeValue = newText;
      return { success: true, updated: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      if (onError) onError(index, errorMessage);
      return { success: false, error: errorMessage };
    }
  };

// Function composition for batch updating nodes
export function updateTextNodes(
  textInfos: TextInfo[],
  updates: Record<number, string>,
  onError?: (index: number, error: string) => void
): { successCount: number; errorCount: number } {
  if (textInfos.length === 0) {
    return { successCount: 0, errorCount: 0 };
  }

  const textInfoMap = createTextInfoMap(textInfos);
  const nodeUpdater = createNodeUpdater(onError);

  let successCount = 0;
  let errorCount = 0;

  Object.entries(updates).forEach(([idx, text]) => {
    const index = parseInt(idx, 10);
    const result = nodeUpdater(textInfoMap, index, text);

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
  });

  return { successCount, errorCount };
}

// Curried function for creating an update handler with context
export function createUpdateHandler(
  textInfos: TextInfo[],
  shouldLogErrors: boolean = false
) {
  const errorHandler = shouldLogErrors
    ? (index: number, error: string) =>
        console.warn(`Node at index ${index} not found in textInfos.`)
    : undefined;

  return (updates: Record<number, string>) =>
    updateTextNodes(textInfos, updates, errorHandler);
}

// Utility for validating TextInfo array
export function validateTextInfos(textInfos: TextInfo[]): boolean {
  return textInfos.every(
    (info) =>
      info &&
      info.node &&
      info.node.nodeType === Node.TEXT_NODE &&
      info.element &&
      typeof info.original === 'string'
  );
}

// Function for safely retrieving node statistics
export function getTextInfoStats(textInfos: TextInfo[]): {
  total: number;
  valid: number;
  invalid: number;
} {
  const total = textInfos.length;
  const valid = textInfos.filter(
    (info) => info?.node?.nodeType === Node.TEXT_NODE
  ).length;

  return {
    total,
    valid,
    invalid: total - valid,
  };
}
