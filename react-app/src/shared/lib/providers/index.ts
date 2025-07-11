import { localProvider } from './local';
import { ollamaProvider } from './ollama';
import { TranslationProvider } from './types';

// export type ProviderType = 'local' | 'ollama' | 'openrouter';
export type ProviderType = 'local' | 'ollama';

const providers: Record<ProviderType, TranslationProvider> = {
  local: localProvider,
  ollama: ollamaProvider,
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
