import { embeddedOllamaProvider } from './embedded-ollama';
import { ollamaProvider } from './ollama';
import { ProviderType } from './types';

const providers: Record<ProviderType, ModelUseProvider> = {
  Ollama: ollamaProvider,
  'Embedded Ollama': embeddedOllamaProvider,
  // openrouter: openrouterProvider,
};

export const getModelUseProvider = (type: ProviderType): ModelUseProvider => {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Provider ${type} not found`);
  }
  return provider;
};
