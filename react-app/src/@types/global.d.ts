type ModelStatus = 'notDownloaded' | 'downloading' | 'downloaded' | 'error';

interface ModelUseProvider {
  initialize?: () => Promise<void>;
  generate: (options: GenerateOptions) => void;
  abort?: () => void;
}

interface TextInfo {
  node: Text;
  original: string;
  element: HTMLElement;
}

// Algebraic type for parsing result
type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface Chunk {
  idx: number;
  text: string;
}

type ModelResponse = Chunk | string;

interface Params {
  responseMode: 'arrayStream' | 'stringStream' | string;
  instruction?: string;
  think?: false;
  useContextualTranslation?: boolean;
}

interface Progress {
  file: string;
  progress: number;
}

interface Icon {
  width?: number;
  height?: number;
  color?: string;
  style?: React.CSSProperties;
}

interface Message {
  status: string;
  data?: Progress;
  output?: string | any[];
  error?: unknown;
}

interface ModelDownloadProgress {
  modelName: string;
  currentFile: string;
  fileProgress: number;
  overallProgress: number;
  completedFiles: number;
  totalFiles: number;
  downloadedSize: number;
  totalSize: number;
}

interface Window {
  electron: {
    onStatus: (callback: (message: Message) => void) => () => void;
    run: (message: any) => void;
    updateTranslations: (message: any) => void;
    models: {
      checkAvailability: () => Promise<Record<string, boolean>>;
      download: (modelName: string) => Promise<{ success: boolean }>;
      getAvailable: () => Promise<Record<string, any>>;
      delete: (modelName: string) => Promise<{ success: boolean }>;
      onDownloadProgress: (
        callback: (progress: ModelDownloadProgress) => void
      ) => () => void;
    };
  };
}
