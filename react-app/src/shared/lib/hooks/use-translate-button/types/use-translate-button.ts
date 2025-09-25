import { RefObject } from 'react';

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
export interface UseTranslateButtonConfig {
  onTranslate?: () => void;
  onStop?: () => void;
  isProcessing?: boolean;
  positionOffset?: { x: number; y: number };
  containerRef?: RefObject<HTMLElement | null> | null;
}
