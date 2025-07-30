export interface GenerateOptions {
  text: string | string[];
  translateLanguage: 'en-ru' | 'ru-en';
  model?: string;
  url?: string;
  typeUse?: 'instruction' | 'translation';
  onChunk?: (chunk: { idx: number; text: string }) => void;
  onProgress?: (progress: Progress) => void;
  signal?: AbortSignal;
  params: Params;
}

export interface TranslationProvider {
  initialize?: () => Promise<void>;
  generate: (options: GenerateOptions) => Promise<Record<number, string>>;
  abort?: () => void;
}
