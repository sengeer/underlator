import { useState, useEffect, useCallback, useRef } from 'react';
import { isValidPdfSelection } from '../../utils/pdf-container-validator';

// Algebraic types for button state
export type TranslateButtonState =
  | { type: 'hidden' }
  | { type: 'translate'; position: { x: number; y: number } }
  | { type: 'stop'; position: { x: number; y: number } };

export type TranslateButtonPosition = {
  x: number;
  y: number;
};

// Hook configuration
interface UseTranslateButtonConfig {
  onTranslate?: () => void;
  onStop?: () => void;
  isProcessing?: boolean;
  positionOffset?: { x: number; y: number };
}

// Default configuration following functional programming principles
const defaultConfig: Required<UseTranslateButtonConfig> = {
  onTranslate: () => {},
  onStop: () => {},
  isProcessing: false,
  positionOffset: { x: -12, y: -28 },
};

// Calculating button position
function calculateButtonPosition(
  range: Range,
  offset: { x: number; y: number }
): TranslateButtonPosition {
  const rect = range.getBoundingClientRect();
  return {
    x: rect.right + window.scrollX + offset.x,
    y: rect.top + window.scrollY + offset.y,
  };
}

// Getting selection and text
function getSelectionInfo() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { selection: null, text: '', range: null };
  }

  const text = selection.toString().trim();
  const range = selection.getRangeAt(0);

  return { selection, text, range };
}

// Custom hook for translate button management
export function useTranslateButton(config: UseTranslateButtonConfig = {}) {
  const mergedConfig = { ...defaultConfig, ...config };
  const { onTranslate, onStop, isProcessing, positionOffset } = mergedConfig;

  const [buttonState, setButtonState] = useState<TranslateButtonState>({
    type: 'hidden',
  });

  const timeoutRef = useRef<number | null>(null);

  // Handler for click events with validation
  const handleSelectionChange = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const { selection, text, range } = getSelectionInfo();

      // Validate selection using our utility
      if (!text || !selection || !range || !isValidPdfSelection(selection)) {
        setButtonState({ type: 'hidden' });
        return;
      }

      const position = calculateButtonPosition(range, positionOffset);

      // Determine button state based on processing status
      if (isProcessing) {
        setButtonState({ type: 'stop', position });
      } else {
        setButtonState({ type: 'translate', position });
      }
    }, 10);
  }, [isProcessing, positionOffset]);

  // Effect for handling button state changes based on processing status
  useEffect(() => {
    if (buttonState.type !== 'hidden') {
      const newType = isProcessing ? 'stop' : 'translate';
      if (buttonState.type !== newType) {
        setButtonState((prev) =>
          prev.type !== 'hidden' ? { ...prev, type: newType } : prev
        );
      }
    }
  }, [isProcessing, buttonState.type]);

  // Effect for setting up event listeners
  useEffect(() => {
    document.addEventListener('click', handleSelectionChange);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('click', handleSelectionChange);
      document.removeEventListener('selectionchange', handleSelectionChange);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleSelectionChange]);

  // Handler functions with proper cleanup
  const handleTranslateClick = useCallback(() => {
    onTranslate();
  }, [onTranslate]);

  const handleStopClick = useCallback(() => {
    onStop();
    setButtonState({ type: 'hidden' });
  }, [onStop]);

  const hideButton = useCallback(() => {
    setButtonState({ type: 'hidden' });
  }, []);

  return {
    buttonState,
    handleTranslateClick,
    handleStopClick,
    hideButton,
    isVisible: buttonState.type !== 'hidden',
    isProcessing: buttonState.type === 'stop',
    position: buttonState.type !== 'hidden' ? buttonState.position : null,
  };
}
