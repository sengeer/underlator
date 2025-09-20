/**
 * @module Services
 * @description Индексный файл для экспорта всех сервисов
 */

// Экспорт Ollama API клиента
export { OllamaApi, createOllamaApi } from './ollama-api';

// Экспорт Ollama Manager
export { ollamaManager as OllamaManager } from './ollama-manager';

// Экспорт Model Catalog Service
export {
  ModelCatalogService,
  createModelCatalogService,
} from './model-catalog';
