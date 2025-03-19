interface Icon {
  width?: number;
  height?: number;
  color?: string;
  style?: CSSPropertyRuleStyle;
}

interface Message {
  status: string;
  data?: Progress;
  output?: string | any[];
  error?: unknown;
}

interface Window {
  electron: {
    onStatus: (callback: (message: Message) => void) => void;
    run: (message: any) => void;
  };
}
