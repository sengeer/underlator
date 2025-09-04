import { localProvider } from './local';
import { ollamaProvider } from './ollama';
import { ProviderType } from './types';

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
