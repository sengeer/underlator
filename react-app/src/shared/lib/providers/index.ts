import { localProvider } from './local';
import { ollamaProvider } from './ollama';
import { ModelUseProvider } from './types';

// export type ProviderType = 'Electron IPC' | 'Ollama' | 'openrouter';
export type ProviderType = 'Electron IPC' | 'Ollama';

const providers: Record<ProviderType, ModelUseProvider> = {
  'Electron IPC': localProvider,
  Ollama: ollamaProvider,
  // openrouter: {} as openrouterProvider,
};

export const getModelUseProvider = (type: ProviderType): ModelUseProvider => {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Provider ${type} not found`);
  }
  return provider;
};
