import { UseTranslateButtonConfig } from '../types/use-translate-button';

// Default configuration following functional programming principles
export const DEFAULT_CONFIG: Required<UseTranslateButtonConfig> = {
  onTranslate: () => {},
  onStop: () => {},
  isProcessing: false,
  positionOffset: { x: -32, y: 5 },
  containerRef: null,
};
