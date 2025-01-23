interface Progress {
  file: string;
  progress: number;
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
