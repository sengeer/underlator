export interface GenerateOptions {
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
