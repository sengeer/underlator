/**
 * @module Services
 * Индексный файл для экспорта всех сервисов.
 */

export { OllamaApi, createOllamaApi } from './ollama-api';

export { ollamaManager as OllamaManager } from './ollama-manager';

export {
  ModelCatalogService,
  createModelCatalogService,
} from './model-catalog';
