import { localProvider } from './local';
import { ollamaProvider } from './ollama';
import { TranslationProvider } from './types';

// export type ProviderType = 'Electron IPC' | 'Ollama' | 'openrouter';
export type ProviderType = 'Electron IPC' | 'Ollama';

const providers: Record<ProviderType, TranslationProvider> = {
  'Electron IPC': localProvider,
  Ollama: ollamaProvider,
  // openrouter: {} as openrouterProvider,
};

export const getTranslationProvider = (
  type: ProviderType
): TranslationProvider => {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Provider ${type} not found`);
  }
  return provider;
};
