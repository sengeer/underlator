import createNodeUpdater from '../hofs/create-node-updater';

// Utility for managing DOM text nodes

// Pure function for creating a Map from TextInfo array
export const createTextInfoMap = (
  textInfos: TextInfo[]
): Map<number, TextInfo> =>
  new Map(textInfos.map((info, index) => [index, info]));

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
        console.warn(`⚠️ Node at index ${index} not found in textInfos`)
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
