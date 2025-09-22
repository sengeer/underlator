import { embeddedOllamaProvider } from './api';
import type { EmbeddedOllamaProvider } from './types';

// Экспорт основного провайдера
export { embeddedOllamaProvider };

// Экспорт типов для использования в других модулях
export type { EmbeddedOllamaProvider };

// Экспорт по умолчанию для совместимости
export default embeddedOllamaProvider;
