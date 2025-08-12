import { TranslationProvider, GenerateOptions } from '../types';

export const localProvider: TranslationProvider = {
  generate: async ({
    text,
    translateLanguage,
    onModelResponse,
    onProgress,
  }: GenerateOptions) => {
    return new Promise((resolve, reject) => {
      function handleStatusUpdate(message: any) {
        switch (message.status) {
          case 'progress':
            if (message.data && onProgress) onProgress(message.data);
            break;
          case 'message':
            if (onModelResponse && message.data) onModelResponse(message.data);
            break;
          case 'complete':
            unsubscribe();
            if (onProgress) onProgress({ file: '', progress: 0 });
            resolve({});
            break;
          case 'error':
            unsubscribe();
            reject(new Error(message.error || 'Unknown electron error'));
            break;
        }
      }

      const unsubscribe = window.electron.onStatus(handleStatusUpdate);

      try {
        window.electron.run({
          translate: translateLanguage,
          text: text,
        });
      } catch (err) {
        unsubscribe();
        reject(err);
      }
    });
  },
};
