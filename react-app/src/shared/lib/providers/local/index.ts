import { TranslationProvider, GenerateOptions } from '../types';

const DELIM = '␟'; // U+241F

export const localProvider: TranslationProvider = {
  generate: async ({
    text,
    translateLanguage,
    onChunk,
    onProgress,
  }: GenerateOptions) => {
    return new Promise((resolve, reject) => {
      const handleStatusUpdate = (message: any) => {
        switch (message.status) {
          case 'progress':
            if (message.data && onProgress) onProgress(message.data);
            break;
          case 'chunk':
            if (
              onChunk &&
              message.data?.idx !== undefined &&
              message.data?.text !== undefined
            )
              onChunk(message.data);
            break;
          case 'complete':
            unsubscribe();
            resolve({});
            if (onProgress) onProgress({ file: '', progress: 0 });
            break;
          case 'error':
            unsubscribe();
            reject(new Error(message.error || 'Unknown electron error'));
            break;
        }
      };

      const unsubscribe = window.electron.onStatus(handleStatusUpdate);

      const joinedText = Array.isArray(text) ? text.join(DELIM) : text;

      try {
        window.electron.run({
          translate: translateLanguage,
          text: joinedText,
          delimiter: DELIM,
        });
      } catch (err) {
        unsubscribe();
        reject(err);
      }
    });
  },
};
