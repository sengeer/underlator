/**
 * Утилита для управления текстовыми узлами DOM
 * Следует принципам функционального программирования и оптимизирована по Big-O
 */

export interface TextInfo {
  node: Text;
  original: string;
  element: HTMLElement;
}

// Алгебраический тип для результата операции с узлом
export type NodeOperationResult =
  | { success: true; updated: boolean }
  | { success: false; error: string };

// Чистая функция для создания Map из массива TextInfo
export const createTextInfoMap = (
  textInfos: TextInfo[]
): Map<number, TextInfo> =>
  new Map(textInfos.map((info, index) => [index, info]));

// HOF для создания функции обновления узла с кастомной логикой
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

// Композиция функций для пакетного обновления узлов
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

// Каррированная функция для создания обработчика обновлений с контекстом
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

// Утилита для валидации TextInfo массива
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

// Функция для безопасного получения статистики узлов
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
