import { findAncestorWithClass } from '../../utils/pdf-container-validator';

// HOF for creating validation predicate
export const createPdfContainerValidator =
  (containerClass: string = 'pdf-viewer__document') =>
  (selection: Selection | null): boolean => {
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const ancestor = findAncestorWithClass(
      range.commonAncestorContainer,
      containerClass
    );

    return ancestor !== null;
  };

export default createPdfContainerValidator;
