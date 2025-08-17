// Algebraic type for node operation result
export type NodeOperationResult =
  | { success: true; updated: boolean }
  | { success: false; error: string };

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

export default createNodeUpdater;
