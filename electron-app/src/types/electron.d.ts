/**
 * Типы для Electron API
 * Расширяет глобальные типы для лучшей поддержки TypeScript
 */

declare global {
  interface Window {
    electron: {
      run: (data: { translate: string; text: string }) => Promise<any>;
      onStatus: (callback: (message: any) => void) => () => void;
      updateTranslations: (translations: any) => void;
      models: {
        checkAvailability: () => Promise<any>;
        download: (modelName: string) => Promise<any>;
        getAvailable: () => Promise<any>;
        delete: (modelName: string) => Promise<any>;
        onDownloadProgress: (callback: (progress: any) => void) => () => void;
      };
    };
  }
}

export {};
