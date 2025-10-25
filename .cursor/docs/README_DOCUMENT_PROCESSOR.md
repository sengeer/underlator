# Сервис обработки PDF документов

Универсальный сервис для обработки PDF документов с расширяемой архитектурой, готовой для добавления мультимодальных возможностей и поддержки других форматов документов.

## Основные возможности

- **Обработка PDF документов**: Извлечение текста с сохранением структуры страниц и метаданных
- **Разбиение на чанки**: Контекстно-значимые фрагменты с перекрытием для сохранения контекста
- **Извлечение метаданных**: Получение информации о документе включая название, автора, дату создания
- **Валидация документов**: Проверка корректности PDF и ограничение размера для предотвращения проблем с памятью
- **Поддержка кодировок**: UTF-8, Windows-1251, ISO-8859-1 и другие кодировки
- **Обработка ошибок**: Интеграция с системой обработки ошибок с информативными сообщениями
- **Потоковая обработка**: Поддержка больших PDF документов с обработкой по страницам
- **Прогресс-индикаторы**: Отслеживание длительных операций обработки
- **Расширяемая архитектура**: Готовность к мультимодальному RAG с поддержкой графиков, таблиц, изображений
- **Система плагинов**: Расширение функциональности для различных форматов документов

## Архитектура

### Основные компоненты

1. **DocumentProcessorService** - Основной сервис для обработки документов
2. **PDFProcessor** - Встроенный процессор для PDF документов
3. **EncodingUtils** - Утилиты для работы с различными кодировками
4. **TextAnalysisUtils** - Утилиты для анализа текста
5. **PDFMetadataUtils** - Утилиты для работы с метаданными PDF
6. **PDFCoordinatesUtils** - Утилиты для работы с координатами текста
7. **DocumentProcessorPluginManager** - Менеджер плагинов для расширения функциональности

### Интерфейсы

- **DocumentProcessor** - Базовый интерфейс для процессоров документов
- **MultimodalProcessor** - Интерфейс для мультимодальных процессоров
- **DocumentProcessorPlugin** - Интерфейс для плагинов обработки документов

## Использование

### Базовое использование

```typescript
import { createDocumentProcessorService } from './services/document-processor';

// Создание сервиса с настройками по умолчанию
const processor = createDocumentProcessorService();

// Инициализация сервиса
await processor.initialize();

// Обработка PDF документа
const result = await processor.processPDF('/path/to/document.pdf');

if (result.success) {
  console.log('Документ обработан успешно');
  console.log('Метаданные:', result.data.metadata);
  console.log('Количество страниц:', result.data.pages.length);
} else {
  console.error('Ошибка обработки:', result.error);
}
```

### Обработка с прогрессом

```typescript
const result = await processor.processPDF('/path/to/document.pdf', {
  onProgress: (progress) => {
    console.log(`Прогресс: ${progress.progress}% - ${progress.message}`);
  },
  chatId: 'chat-123',
});
```

### Разбиение на чанки

```typescript
const chunksResult = await processor.splitIntoChunks(
  extractedText,
  metadata,
  'chat-123',
  {
    onProgress: (progress) => {
      console.log(`Создание чанков: ${progress.progress}%`);
    }
  }
);

if (chunksResult.success) {
  console.log(`Создано ${chunksResult.data.length} чанков`);
}
```

### Извлечение метаданных

```typescript
const metadataResult = await processor.extractMetadata('/path/to/document.pdf');

if (metadataResult.success) {
  const metadata = metadataResult.data;
  console.log('Название:', metadata.title);
  console.log('Автор:', metadata.author);
  console.log('Количество страниц:', metadata.pageCount);
}
```

### Валидация документа

```typescript
const fileBuffer = await fs.readFile('/path/to/document.pdf');
const validationResult = await processor.validateDocument(fileBuffer, '/path/to/document.pdf');

if (validationResult.success) {
  console.log('Документ валиден');
} else {
  console.error('Ошибка валидации:', validationResult.error);
}
```

## Конфигурация

### Настройки по умолчанию

```typescript
const config = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  chunkSize: 512,
  chunkOverlap: 50,
  supportedEncodings: ['utf-8', 'windows-1251', 'iso-8859-1'],
  enableVerboseLogging: true,
  enableStreaming: true,
  maxPages: 1000,
  extractMetadata: true,
  extractCoordinates: true,
};

const processor = createDocumentProcessorService(config);
```

### Настройки для различных типов файлов

```typescript
import { getFileTypeSettings } from './constants/document-processor';

const pdfSettings = getFileTypeSettings('pdf');
console.log('Максимальный размер PDF:', pdfSettings.maxFileSize);
console.log('Максимальное количество страниц:', pdfSettings.maxPages);
```

## Система плагинов

### Использование встроенных плагинов

```typescript
import {
  DocumentProcessorPluginManager,
  createDocumentProcessorPluginManager
} from './services/document-processor-plugins';

const pluginManager = createDocumentProcessorPluginManager();
await pluginManager.initialize();

// Получение плагина для обработки изображений
const imagePlugin = pluginManager.getPlugin('image-processing');
if (imagePlugin) {
  const result = await imagePlugin.process(pdfBuffer);
  console.log('Извлеченные изображения:', result.data);
}
```

### Создание собственного плагина

```typescript
import { BaseDocumentProcessorPlugin } from './services/document-processor-plugins';

class CustomProcessingPlugin extends BaseDocumentProcessorPlugin {
  readonly name = 'custom-processing';
  readonly version = '1.0.0';
  readonly description = 'Пользовательский плагин обработки';
  readonly supportedFileTypes = ['pdf'];

  protected async onInitialize(): Promise<void> {
    // Инициализация плагина
  }

  protected async onProcess(input: Buffer, options: ProcessingOptions): Promise<any> {
    // Логика обработки
    return { success: true, data: 'processed' };
  }

  protected async onCleanup(): Promise<void> {
    // Очистка ресурсов
  }
}

// Регистрация плагина
const customPlugin = new CustomProcessingPlugin();
await pluginManager.registerPlugin(customPlugin);
```

## Утилиты

### Работа с кодировками

```typescript
import { EncodingUtils } from './services/document-processor-utils';

// Автоматическое определение кодировки
const encodingInfo = EncodingUtils.detectEncoding(buffer);
console.log('Определенная кодировка:', encodingInfo.encoding);
console.log('Уровень уверенности:', encodingInfo.confidence);

// Конвертация кодировки
const convertedResult = EncodingUtils.convertEncoding(
  text,
  'windows-1251',
  'utf-8'
);
```

### Анализ текста

```typescript
import { TextAnalysisUtils } from './services/document-processor-utils';

// Анализ текста
const analysis = TextAnalysisUtils.analyzeText(text, 'utf-8');
console.log('Количество слов:', analysis.wordCount);
console.log('Количество предложений:', analysis.sentenceCount);
console.log('Средняя длина слова:', analysis.averageWordLength);

// Извлечение ключевых слов
const keywords = TextAnalysisUtils.extractKeywords(text, 10);
console.log('Ключевые слова:', keywords);
```

### Работа с метаданными PDF

```typescript
import { PDFMetadataUtils } from './services/document-processor-utils';

// Извлечение метаданных
const metadataResult = await PDFMetadataUtils.extractMetadata(buffer);
if (metadataResult.success) {
  const metadata = metadataResult.data;
  console.log('Версия PDF:', metadata.pdfVersion);
  console.log('Количество страниц:', metadata.pageCount);
}

// Валидация метаданных
const validationResult = PDFMetadataUtils.validateMetadata(metadata);
if (validationResult.success) {
  console.log('Метаданные валидны');
}
```

## Обработка ошибок

Сервис интегрирован с системой обработки ошибок и предоставляет детальную информацию об ошибках:

```typescript
try {
  const result = await processor.processPDF('/path/to/document.pdf');
  if (!result.success) {
    console.error('Ошибка обработки:', result.error);
    console.error('Тип ошибки:', result.errorType);
    console.error('Контекст:', result.context);
  }
} catch (error) {
  console.error('Критическая ошибка:', error);
}
```

## Производительность

### Оптимизация для больших документов

```typescript
const config = {
  enableStreaming: true,
  maxPages: 500,
  chunkSize: 1024,
  chunkOverlap: 100,
};

const processor = createDocumentProcessorService(config);
```

### Мониторинг использования памяти

```typescript
const result = await processor.processPDF('/path/to/large-document.pdf', {
  onProgress: (progress) => {
    if (progress.stageStatistics?.memoryUsage) {
      console.log('Использование памяти:', progress.stageStatistics.memoryUsage);
    }
  }
});
```

## Безопасность

### Ограничения файлов

```typescript
import { SECURITY_SETTINGS } from './constants/document-processor';

// Проверка разрешенных типов файлов
const isAllowed = SECURITY_SETTINGS.allowedFileTypes.includes('pdf');
console.log('PDF разрешен:', isAllowed);

// Проверка заблокированных типов
const isBlocked = SECURITY_SETTINGS.blockedFileTypes.includes('exe');
console.log('EXE заблокирован:', isBlocked);
```

## Расширение функциональности

### Добавление поддержки новых форматов

1. Создайте новый процессор, реализующий интерфейс `DocumentProcessor`
2. Зарегистрируйте процессор в `DocumentProcessorService`
3. Добавьте настройки для нового формата в константы

### Добавление мультимодальных возможностей

1. Создайте плагин, расширяющий `MultimodalProcessor`
2. Реализуйте методы для обработки графиков, таблиц, изображений
3. Зарегистрируйте плагин в `DocumentProcessorPluginManager`

## Зависимости

Для полной функциональности требуется установка следующих зависимостей:

```bash
npm install pdf-parse
npm install iconv-lite
npm install sharp
npm install mammoth
npm install pdf-table-extractor
npm install opencv4nodejs
npm install mathpix-api
```

## Тестирование

```typescript
import { createDocumentProcessorService } from './services/document-processor';

describe('DocumentProcessorService', () => {
  let processor: DocumentProcessorService;

  beforeEach(async () => {
    processor = createDocumentProcessorService();
    await processor.initialize();
  });

  afterEach(async () => {
    await processor.cleanup();
  });

  it('should process PDF document', async () => {
    const result = await processor.processPDF('/path/to/test.pdf');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Логирование

Сервис поддерживает детальное логирование операций:

```typescript
const processor = createDocumentProcessorService({
  enableVerboseLogging: true,
});

// Логи будут выводиться в консоль с детальной информацией
```

## Заключение

Сервис обработки PDF документов предоставляет мощную и расширяемую платформу для работы с документами в RAG системе. Архитектура позволяет легко добавлять новые форматы документов и мультимодальные возможности, обеспечивая при этом высокую производительность и надежность.
