type ModelStatus = 'notDownloaded' | 'downloading' | 'downloaded' | 'error';

interface ModelUseProvider {
  initialize?: () => Promise<void>;
  generate: (options: GenerateOptions) => void;
  abort?: () => void;
}

interface GenerateOptions {
  text: string | string[];
  translateLanguage: 'en-ru' | 'ru-en';
  model?: string;
  url?: string;
  typeUse?: 'instruction' | 'translation';
  onModelResponse?: (response: ModelResponse) => void;
  onProgress?: (progress: Progress) => void;
  signal?: AbortSignal;
  params: Params;
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
  think?: boolean;
  useContextualTranslation?: boolean;
  temperature?: number;
  maxTokens?: number;
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
    updateTranslations: (message: any) => void;
    ollama: {
      generate: (request: any) => Promise<string>;
      stop: () => Promise<void>;
      onGenerateProgress: (callback: (progress: any) => void) => () => void;
    };
    models: {
      install: (request: any) => Promise<{ success: boolean }>;
      remove: (request: any) => Promise<{ success: boolean }>;
      list: () => Promise<any>;
      onInstallProgress: (callback: (progress: any) => void) => () => void;
    };
    catalog: {
      get: (params?: { forceRefresh?: boolean }) => Promise<any>;
      search: (filters: any) => Promise<any>;
      getModelInfo: (params: { modelName: string }) => Promise<any>;
    };
    splash: {
      getStatus: () => Promise<any>;
      onStatusUpdate: (callback: (status: any) => void) => () => void;
      onProgressUpdate: (callback: (progress: any) => void) => () => void;
      onComplete: (callback: () => void) => () => void;
      onError: (callback: (error: any) => void) => () => void;
    };
  };
}
