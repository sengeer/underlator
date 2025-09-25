import { useState, useEffect, useCallback, useRef, RefObject } from 'react';
import { isValidPdfSelection } from '../../utils/pdf-container-validator';
import { DEFAULT_CONFIG } from './constants/use-translate-button';
import {
  UseTranslateButtonConfig,
  TranslateButtonState,
  TranslateButtonPosition,
} from './types/use-translate-button';

// Calculating button position
function calculateButtonPosition(
  range: Range,
  offset: { x: number; y: number },
  containerRef: RefObject<HTMLElement | null> | null
): TranslateButtonPosition {
  const rect = range.getBoundingClientRect();

  const containerHeight = containerRef?.current
    ? containerRef.current.offsetHeight
    : 0;

  return {
    x: rect.right + window.scrollX + offset.x,
    y: rect.top + window.scrollY - containerHeight + offset.y,
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
function useTranslateButton(config: UseTranslateButtonConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { onTranslate, onStop, isProcessing, positionOffset, containerRef } =
    mergedConfig;

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

      const position = calculateButtonPosition(
        range,
        positionOffset,
        containerRef
      );

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

export default useTranslateButton;
