import createPdfContainerValidator from '../hofs/create-pdf-container-validator';

// Utility for validating PDF container

// Algebraic type for validation result
export type ContainerValidationResult =
  | { isValid: true; container: Element }
  | { isValid: false; reason: string };

// Pure function for checking if element has specific class
const hasClass = (element: Element, className: string): boolean =>
  element.classList.contains(className);

// Pure function for traversing DOM upward
export function findAncestorWithClass(
  node: Node | null,
  className: string,
  maxDepth: number = 10
): Element | null {
  let currentNode = node;
  let depth = 0;

  while (currentNode && depth < maxDepth) {
    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const element = currentNode as Element;
      if (hasClass(element, className)) {
        return element;
      }
    }
    currentNode = currentNode.parentNode;
    depth++;
  }

  return null;
}

// Default validator instance
export const isPdfContentSelection = createPdfContainerValidator();

// Utility for checking if selection has meaningful text
export function hasValidTextSelection(selection: Selection | null): boolean {
  if (!selection) return false;

  const text = selection.toString().trim();
  return text.length > 0;
}

// Composed validation function
export const isValidPdfSelection = (selection: Selection | null): boolean =>
  hasValidTextSelection(selection) && isPdfContentSelection(selection);
