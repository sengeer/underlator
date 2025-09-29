/**
 * @module GetModelUseProvider
 * Фабрика провайдеров для работы с LLM моделями.
 * Предоставляет единую точку доступа к различным провайдерам.
 * Поддерживает динамическое переключение между провайдерами.
 */

import { embeddedOllamaProvider } from './providers/embedded-ollama';
import { ollamaProvider } from './providers/ollama';

/**
 * Реестр доступных провайдеров.
 * Содержит маппинг типов провайдеров на их реализации.
 */
const providers: Record<ProviderType, ModelUseProvider> = {
  Ollama: ollamaProvider,
  'Embedded Ollama': embeddedOllamaProvider,
  // openrouter: openrouterProvider,
};

/**
 * Получает провайдер по типу.
 * Возвращает конкретную реализацию провайдера для работы с LLM.
 * @param type - Тип провайдера для получения.
 * @returns Экземпляр провайдера для работы с моделями.
 * @throws {Error} Если провайдер с указанным типом не найден.
 */
export const getModelUseProvider = (type: ProviderType): ModelUseProvider => {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`❌ Provider ${type} not found`);
  }
  return provider;
};
