# Утилиты для работы с эмбеддингами

## Обзор

Модуль `embedding.ts` предоставляет комплексный набор утилит для работы с векторными эмбеддингами в RAG системе. Все утилиты оптимизированы для производительности и включают обработку ошибок, кэширование и мониторинг.

## Основные возможности

### 1. Нормализация эмбеддингов
```typescript
const utils = createEmbeddingUtils();
const result = await utils.normalizeEmbedding(embedding, 'nomic-embed-text');
```

### 2. Вычисление схожести
```typescript
const similarity = await utils.calculateSimilarity(
  embedding1,
  embedding2,
  ['cosine', 'euclidean', 'dotProduct']
);
```

### 3. Валидация размерности
```typescript
const isValid = await utils.validateEmbeddingDimensions(embedding, 'nomic-embed-text');
```

### 4. Сжатие эмбеддингов
```typescript
const compressed = await utils.compressEmbeddings(
  embedding,
  'quantization',
  0.5 // уровень сжатия
);
```

### 5. Объединение эмбеддингов
```typescript
const merged = await utils.mergeEmbeddings(
  embeddings,
  'average', // стратегия объединения
  weights // опциональные веса
);
```

### 6. Батчевая обработка
```typescript
const results = await utils.batchEmbeddings(
  embeddings,
  { batchSize: 10, maxConcurrentOperations: 3 },
  processorFunction
);
```

## Быстрые утилиты

Для простых операций доступны статические функции:

```typescript
import { embeddingUtils } from './embedding';

// Быстрая нормализация
const normalized = embeddingUtils.normalize(embedding);

// Быстрое вычисление косинусного сходства
const similarity = embeddingUtils.cosineSimilarity(embedding1, embedding2);

// Быстрая валидация размерности
const isValid = embeddingUtils.validateDimensions(embedding, 'nomic-embed-text');
```

## Мониторинг и оптимизация

### Статистика производительности
```typescript
const stats = utils.getPerformanceStats();
console.log('Среднее время нормализации:', stats.normalizeEmbedding.averageTime);
```

### Управление кэшем
```typescript
// Получение статистики кэша
const cacheStats = utils.getCacheStats();

// Очистка кэша
utils.clearCache();
```

## Поддерживаемые модели

- `nomic-embed-text` (768 измерений)
- `mxbai-embed-large` (1024 измерения)
- `all-minilm` (384 измерения)
- `bge-small-en` (384 измерения)

## Методы сжатия

- **quantization** - квантизация с настраиваемым уровнем точности
- **pca** - уменьшение размерности через PCA
- **sparse** - разреженное представление

## Стратегии объединения

- **average** - усреднение векторов
- **concatenate** - конкатенация векторов
- **weighted** - взвешенное объединение

## Обработка ошибок

Все функции возвращают `EmbeddingOperationResult<T>` с полной информацией об операции:

```typescript
interface EmbeddingOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  model?: string;
  dimensions?: number;
  processingTime?: number;
  memoryStats?: {
    usedMemory: number;
    peakMemory: number;
  };
}
```

## Примеры использования

### Полный пример работы с эмбеддингами
```typescript
import { createEmbeddingUtils } from './embedding';

async function processEmbeddings() {
  const utils = createEmbeddingUtils();

  // Генерация тестовых эмбеддингов
  const embedding1 = Array.from({ length: 768 }, () => Math.random() - 0.5);
  const embedding2 = Array.from({ length: 768 }, () => Math.random() - 0.5);

  // Нормализация
  const normalized1 = await utils.normalizeEmbedding(embedding1, 'nomic-embed-text');
  const normalized2 = await utils.normalizeEmbedding(embedding2, 'nomic-embed-text');

  if (normalized1.success && normalized2.success) {
    // Вычисление схожести
    const similarity = await utils.calculateSimilarity(
      normalized1.data!,
      normalized2.data!,
      ['cosine']
    );

    if (similarity.success) {
      console.log('Косинусное сходство:', similarity.data!.cosine);
    }
  }
}
```

### Тестирование утилит
```typescript
import { demonstrateEmbeddingUtils } from './embedding-test';

// Запуск демонстрации всех возможностей
await demonstrateEmbeddingUtils();
```

## Производительность

- Кэширование результатов для избежания повторных вычислений
- Батчевая обработка для оптимизации множественных операций
- Мониторинг использования памяти и времени выполнения
- Автоматическая оптимизация параметров в зависимости от модели

## Совместимость

Утилиты полностью совместимы с:
- Существующей системой управления моделями Ollama
- IPC обработчиками для RAG системы
- Системой обработки ошибок ErrorHandler
- Константами и типами проекта
