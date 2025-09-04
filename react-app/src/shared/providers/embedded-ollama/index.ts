/**
 * @module EmbeddedOllamaProvider
 * @description Провайдер для работы с Ollama через Electron IPC
 * Заменяет функциональность существующих local и ollama провайдеров
 * Обеспечивает прямое взаимодействие с Ollama через Electron backend
 */

import { embeddedOllamaProvider } from './api';
import type { EmbeddedOllamaProvider } from './types';

// Экспорт основного провайдера
export { embeddedOllamaProvider };

// Экспорт типов для использования в других модулях
export type { EmbeddedOllamaProvider };

// Экспорт по умолчанию для совместимости
export default embeddedOllamaProvider;
