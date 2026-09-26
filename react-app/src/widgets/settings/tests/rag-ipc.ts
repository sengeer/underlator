/**
 * @module RagIpcTest
 * Функции для ручного тестирования RAG IPC API.
 * Используется для проверки работы RAG Electron IPC эндпоинтов.
 *
 * TODO(rag): restore settings Tests UI wiring when rust-core RAG lands; модуль не удалять.
 */

import { ragIpc } from '../../../shared/apis/rag-ipc/';
import {
  DEFAULT_RAG_CHUNK_SIZE,
  DEFAULT_RAG_MODEL,
} from '../../../shared/lib/constants';

/**
 * Открывает диалог выбора PDF файла и обрабатывает его.
 * Тестирует полный цикл работы с документами в RAG системе.
 */
export async function testUploadAndProcessDocument(
  chatId: string = 'test-chat-1'
) {
  console.log('🧪 Тестирование загрузки и обработки PDF документа...');
  console.log(`💬 Чат ID: ${chatId}`);

  try {
    // Создает скрытый input элемент для выбора файла
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';

    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        console.log('❌ Файл не выбран');
        return;
      }

      console.log(
        `📄 Выбранный файл: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`
      );

      try {
        // Использует uploadAndProcessDocument для загрузки и обработки
        const result = await ragIpc.uploadAndProcessDocument(file, chatId, {
          chunkSize: DEFAULT_RAG_CHUNK_SIZE,
          embeddingModel: DEFAULT_RAG_MODEL,
        });

        console.log('✅ Результат обработки документа:', result);
        if (result.success) {
          console.log(`📊 Обработано чанков: ${result.totalChunks}`);
          if (result.chunks.length > 0) {
            console.log(`📝 Первый чанк:`, result.chunks[0]);
          }
        } else {
          console.error('❌ Ошибка обработки:', result.error);
        }
      } catch (error) {
        console.error('❌ Ошибка обработки файла:', error);
      }
    };

    input.click();
  } catch (error) {
    console.error('❌ Ошибка при выборе файла:', error);
  }
}

/**
 * Тестирует поиск релевантных документов.
 * Тестирует IPC endpoint rag:query-documents.
 */
export async function testQueryDocuments(
  query: string = 'Что означает искусственный интеллект?',
  chatId: string = 'test-chat-1'
) {
  console.log('🧪 Тестирование API поиска документов...');
  console.log(`🔍 Запрос: ${query}`);
  console.log(`💬 Чат ID: ${chatId}`);

  try {
    const result = await ragIpc.queryDocuments(
      {
        query,
        chatId,
      },
      {
        topK: 5,
        similarityThreshold: 0.7,
        embeddingModel: DEFAULT_RAG_MODEL,
      }
    );

    console.log('✅ Результат поиска документов:', result);
    if (result.sources && result.sources.length > 0) {
      console.log(`📊 Найдено источников: ${result.sources.length}`);
      console.log(`🎯 Уверенность: ${(result.confidence * 100).toFixed(1)}%`);
      result.sources.forEach((source: any, index: number) => {
        console.log(
          `  ${index + 1}. Релевантность: ${(source.relevance * 100).toFixed(1)}%`
        );
        console.log(`     Контент: ${source.content.substring(0, 80)}...`);
      });
    }
    return result;
  } catch (error) {
    console.error('❌ Ошибка поиска документов:', error);
    throw error;
  }
}

/**
 * Тестирует получение статистики коллекции.
 * Тестирует IPC endpoint rag:get-collection-stats.
 */
export async function testGetCollectionStats(chatId: string = 'test-chat-1') {
  console.log('🧪 Тестирование API получения статистики коллекции...');
  console.log(`💬 Чат ID: ${chatId}`);

  try {
    const result = await ragIpc.getCollectionStats(chatId);

    console.log('✅ Результат получения статистики:', result);
    console.log(`📊 Количество точек: ${result.pointsCount}`);
    console.log(
      `💾 Размер коллекции: ${(result.sizeBytes / 1024).toFixed(2)} KB`
    );
    console.log(`📈 Индексов: ${result.indexesCount}`);
    console.log(`🔄 Статус индексации: ${result.indexingStatus}`);
    return result;
  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error);
    throw error;
  }
}

/**
 * Тестирует получение списка коллекций.
 * Тестирует IPC endpoint rag:list-collections.
 */
export async function testListCollections() {
  console.log('🧪 Тестирование API получения списка коллекций...');

  try {
    const result = await ragIpc.listCollections();

    console.log('✅ Результат получения списка коллекций:', result);
    console.log(`📊 Найдено коллекций: ${result.length}`);
    result.forEach((collection: any, index: number) => {
      console.log(
        `  ${index + 1}. ${collection.name} (чат: ${collection.chatId})`
      );
      console.log(`     Размерность векторов: ${collection.vectorSize}`);
      console.log(`     Метрика расстояния: ${collection.distanceMetric}`);
    });
    return result;
  } catch (error) {
    console.error('❌ Ошибка получения списка коллекций:', error);
    throw error;
  }
}

/**
 * Тестирует удаление коллекции.
 * Тестирует IPC endpoint rag:delete-collection.
 */
export async function testDeleteCollection(chatId: string = 'test-chat-1') {
  console.log('🧪 Тестирование API удаления коллекции...');
  console.log(`💬 Чат ID: ${chatId}`);

  try {
    const result = await ragIpc.deleteDocumentCollection({
      chatId,
    });

    console.log('✅ Результат удаления коллекции:', result);
    if (result.success) {
      console.log(`🗑️ Коллекция для чата ${result.deletedChatId} удалена`);
    } else {
      console.error('❌ Ошибка удаления:', result.error);
    }
    return result;
  } catch (error) {
    console.error('❌ Ошибка удаления коллекции:', error);
    throw error;
  }
}

/**
 * Тестирует подписку на события прогресса.
 * Тестирует IPC endpoint rag:on-processing-progress.
 */
export async function testProcessingProgress() {
  console.log('🧪 Тестирование API подписки на прогресс обработки...');

  try {
    const unsubscribe = ragIpc.onProcessingProgress((progress: any) => {
      console.log('📊 Прогресс обработки:', progress);
      console.log(`   Этап: ${progress.stage}`);
      console.log(`   Прогресс: ${progress.progress}%`);
      console.log(`   Сообщение: ${progress.message}`);
      if (progress.details) {
        console.log(`   Детали:`, progress.details);
      }
    });

    console.log('✅ Подписка на прогресс установлена');
    console.log('⚠️ Для отписки вызовите: unsubscribe()');
    return unsubscribe;
  } catch (error) {
    console.error('❌ Ошибка подписки на прогресс:', error);
    throw error;
  }
}

/**
 * Полный тест RAG системы.
 * Выполняет все операции последовательно.
 */
export async function testFullRagSystem(
  testChatId: string = 'test-chat-1',
  testFilePath?: string
) {
  console.log('🧪 ========== ПОЛНЫЙ ТЕСТ RAG СИСТЕМЫ ==========');

  try {
    // 1. Получить список коллекций
    console.log('\n1️⃣ Тест получения списка коллекций');
    await testListCollections();

    // 2. Получить статистику коллекции (если она существует)
    console.log('\n2️⃣ Тест получения статистики коллекции');
    try {
      await testGetCollectionStats(testChatId);
    } catch (error) {
      console.log('⚠️ Коллекция еще не создана, это нормально');
    }

    // 3. Получить статистику после обработки
    console.log('\n4️⃣ Тест получения статистики после обработки');
    try {
      await testGetCollectionStats(testChatId);
    } catch (error) {
      console.log('⚠️ Не удалось получить статистику');
    }

    // 4. Выполнить поиск
    console.log('\n5️⃣ Тест поиска документов');
    try {
      await testQueryDocuments('тестовый запрос', testChatId);
    } catch (error) {
      console.log('⚠️ Не удалось выполнить поиск');
    }

    // 5. Удалить коллекцию
    console.log('\n6️⃣ Тест удаления коллекции');
    try {
      await testDeleteCollection(testChatId);
    } catch (error) {
      console.log('⚠️ Не удалось удалить коллекцию');
    }

    console.log('\n✅ ========== ТЕСТ ЗАВЕРШЕН ==========');
  } catch (error) {
    console.error('\n❌ ========== ТЕСТ ПРОВАЛЕН ==========');
    console.error('Ошибка:', error);
    throw error;
  }
}

/**
 * Генерирует ответ LLM с использованием RAG контекста из документов.
 */
export async function testGenerateWithRagContext(
  query: string,
  chatId: string,
  model: string = 'gemma3:1b'
) {
  console.log('🧪 Тестирование генерации с RAG контекстом...');
  console.log(`🔍 Запрос: ${query}`);
  console.log(`💬 Чат ID: ${chatId}`);
  console.log(`🤖 Модель: ${model}`);

  try {
    // Сначала ищет релевантные документы
    const searchResult = await ragIpc.queryDocuments(
      {
        query,
        chatId,
      },
      {
        topK: 3,
        similarityThreshold: 0.3,
      }
    );

    console.log(
      '✅ Найдено релевантных источников:',
      searchResult.sources.length
    );
    console.log(
      `🎯 Уверенность: ${(searchResult.confidence * 100).toFixed(1)}%`
    );

    // Формирует промпт с контекстом из документов
    const context = searchResult.sources
      .map((source: any, index: number) => {
        // Извлекает текстовое содержимое из source
        const content =
          typeof source === 'string'
            ? source
            : source.content || JSON.stringify(source);
        return `${index + 1}. ${content}`;
      })
      .join('\n\n');

    const prompt = `Используй следующую информацию из документов для ответа на вопрос:\n\n${context}\n\nВопрос: ${query}`;

    console.log('🤖 Запускаем генерацию с RAG контекстом...');

    // Генерирует ответ через model API
    try {
      const response = await (window as any).electron.model.generate(
        {
          model: model,
          prompt: prompt,
          temperature: 0.7,
          max_tokens: 2048,
        },
        {
          id: 'rag-generation',
          url: 'http://localhost:11434',
        }
      );

      console.log('✅ Генерация завершена');
      console.log('📝 Ответ модели:', response.data);

      return { searchResult, prompt, modelResponse: response.data };
    } catch (error) {
      console.error('❌ Ошибка генерации модели:', error);
      console.log('💡 Созданный промпт для ручной генерации:', prompt);
      return { searchResult, prompt, modelResponse: null };
    }
  } catch (error) {
    console.error('❌ Ошибка генерации с RAG контекстом:', error);
    throw error;
  }
}

// Экспорты для использования в других модулях
export default {
  testUploadAndProcessDocument,
  testQueryDocuments,
  testGetCollectionStats,
  testListCollections,
  testDeleteCollection,
  testProcessingProgress,
  testFullRagSystem,
  testGenerateWithRagContext,
};
