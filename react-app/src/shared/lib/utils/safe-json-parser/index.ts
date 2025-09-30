/**
 * @module SafeJsonParserIndex
 * Индексный файл для экспорта утилит безопасного парсинга JSON.
 * Предоставляет единую точку доступа к функциям для работы с потоковыми JSON данными.
 */

export {
  parseJsonLine,
  processJsonBuffer,
  createChunkProcessor,
  createOllamaChunkProcessor,
} from './safe-json-parser';
