import { embeddedOllamaElectronApi } from '../apis/embedded-ollama-electron-api';
import { OLLAMA_TEST_MODEL, OLLAMA_TEST_PROMPT } from './constants';

/**
 * @module ManualIpcTesting
 * @description Функции для ручного тестирования IPC API с Ollama
 * Используется для проверки работы Electron IPC методов
 */

/**
 * @description Получает список доступных моделей Ollama
 * Тестирует IPC endpoint models:list
 */
export async function testListModels() {
  console.log('🧪 Тестирование API получения списка установленных моделей...');
  await embeddedOllamaElectronApi.listInstalledModels();
}

/**
 * @description Устанавливает OLLAMA_TEST_MODEL с выводом прогресса
 * Тестирует IPC endpoint models:install с streaming прогрессом
 */
export async function testInstallModel() {
  console.log('🧪 Тестирование API установки модели...');
  await embeddedOllamaElectronApi.installModel({
    name: OLLAMA_TEST_MODEL,
  });
}

/**
 * @description Генерирует текст модели OLLAMA_TEST_MODEL
 * Тестирует IPC endpoint ollama:generate с streaming ответом
 */
export async function testGenerateText() {
  try {
    console.log(
      `🧪 Тестирование API генерации текста с моделью ${OLLAMA_TEST_MODEL}...`
    );

    let fullResponse = '';
    let isFirstChunk = true;

    const unsubscribeProgress = window.electron.ollama.onGenerateProgress(
      (chunk) => {
        if (isFirstChunk) {
          console.log('🤖 Начинаем генерацию...');
          isFirstChunk = false;
        }

        if (chunk.response) {
          fullResponse += chunk.response;
          console.log('🤖 Chunk:', chunk.response);
        }

        if (chunk.done) {
          console.log('\n✅ Генерация завершена!');
          console.log(`📝 Полный ответ: ${fullResponse}`);
        }
      }
    );

    // Запуск генерации
    const response = await window.electron.ollama.generate({
      model: OLLAMA_TEST_MODEL,
      prompt: OLLAMA_TEST_PROMPT,
      temperature: 0.7,
      max_tokens: 200,
      num_predict: 1,
    });

    // Отписывание от прогресса
    unsubscribeProgress();

    console.log('✅ Генерация завершена');
    console.log('📝 Финальный ответ:', response);

    if (response.success && response.data) {
      console.log('✅ Генерация успешна, получен текст:', response.data);
    } else {
      console.log('❌ Ошибка генерации');
      if (response.error) {
        console.log('❌ Детали ошибки:', response.error);
      }
    }

    return response;
  } catch (error) {
    console.error('❌ Ошибка генерации текста:', error);
    throw error;
  }
}

/**
 * @description Получает каталог моделей Ollama
 * Тестирует IPC endpoint catalog:get
 */
export async function testGetCatalog() {
  console.log('🧪 Тестирование API получения каталога моделей...');
  await embeddedOllamaElectronApi.getCatalog({ forceRefresh: false });
}

/**
 * @description Получает каталог моделей с принудительным обновлением
 * Тестирует IPC endpoint catalog:get с параметром forceRefresh
 */
export async function testGetCatalogForceRefresh() {
  console.log(
    '🧪 Тестирование API получения каталога моделей с принудительным обновлением...'
  );
  await embeddedOllamaElectronApi.getCatalog({ forceRefresh: true });
}

/**
 * @description Выполняет поиск моделей по фильтрам
 * Тестирует IPC endpoint catalog:search
 */
export async function testSearchModels() {
  try {
    console.log('🧪 Тестирование API поиска моделей...');

    // Тест 1: Поиск по названию
    console.log('🔍 Поиск моделей с "llama" в названии...');
    const nameSearchResponse = await embeddedOllamaElectronApi.searchModels({
      search: 'llama',
      type: 'ollama',
    });

    console.log('✅ Результат поиска "llama":', nameSearchResponse);
    if (
      nameSearchResponse &&
      nameSearchResponse.data &&
      nameSearchResponse.data.ollama
    ) {
      console.log(
        `📋 Найдено ${nameSearchResponse.data.ollama.length} моделей с "llama"`
      );
    }

    // Тест 2: Поиск по размеру
    console.log('🔍 Поиск моделей размером менее 1GB...');
    const sizeSearchResponse = await embeddedOllamaElectronApi.searchModels({
      maxSize: 1024 * 1024 * 1024, // 1GB
      type: 'ollama',
    });

    console.log('✅ Результат поиска по размеру:', sizeSearchResponse);
    if (
      sizeSearchResponse &&
      sizeSearchResponse.data &&
      sizeSearchResponse.data.ollama
    ) {
      console.log(
        `📋 Найдено ${sizeSearchResponse.data.ollama.length} моделей менее 1GB`
      );
    }

    // Тест 3: Поиск по тегам
    console.log('🔍 Поиск моделей с тегом "chat"...');
    const tagsSearchResponse = await embeddedOllamaElectronApi.searchModels({
      tags: ['chat'],
      type: 'ollama',
    });

    console.log('✅ Результат поиска по тегам:', tagsSearchResponse);
    if (
      tagsSearchResponse &&
      tagsSearchResponse.data &&
      tagsSearchResponse.data.ollama
    ) {
      console.log(
        `📋 Найдено ${tagsSearchResponse.data.ollama.length} моделей с тегом "chat"`
      );
    }

    return {
      searchByName: nameSearchResponse,
      searchBySize: sizeSearchResponse,
      searchByTags: tagsSearchResponse,
    };
  } catch (error) {
    console.error('❌ Ошибка поиска моделей:', error);
    throw error;
  }
}

/**
 * @description Получает информацию детальную информацию о конкретной модели
 * Тестирует IPC endpoint catalog:get-model-info
 */
export async function testGetModelInfo() {
  console.log('🧪 Тестирование API получения детальной информации о модели...');
  await embeddedOllamaElectronApi.getModelInfo({
    modelName: OLLAMA_TEST_MODEL,
  });
}

/**
 * @description Удаляет модель
 * Тестирует IPC endpoint models:remove
 */
export async function testRemoveModel() {
  console.log(`🧪 Тестирование API удаления модели ${OLLAMA_TEST_MODEL}...`);
  await embeddedOllamaElectronApi.removeModel({
    name: OLLAMA_TEST_MODEL,
  });
}

/**
 * @description Запускает полный цикл тестирования
 * Выполняет все тесты по порядку
 */
export async function runFullTest() {
  console.log('🚀 Запуск полного цикла тестирования IPC API...\n');

  try {
    console.log('=== ТЕСТ 1: Получение списка моделей ===');
    await testListModels();
    console.log('');

    console.log('=== ТЕСТ 2: Получение каталога моделей ===');
    await testGetCatalog();
    console.log('');

    console.log('=== ТЕСТ 3: Поиск моделей ===');
    await testSearchModels();
    console.log('');

    console.log('=== ТЕСТ 4: Получение информации о модели ===');
    await testGetModelInfo();
    console.log('');

    console.log('=== ТЕСТ 5: Скачивание модели ===');
    await testInstallModel();
    console.log('');

    console.log('=== ТЕСТ 6: Генерация текста ===');
    await testGenerateText();
    console.log('');

    console.log('=== ТЕСТ 7: Удаление модели ===');
    await testRemoveModel();
    console.log('');

    console.log('✅ Все тесты завершены успешно!');
  } catch (error) {
    console.error('❌ Ошибка в тестах:', error);
    throw error;
  }
}

// Экспорты для использования в других модулях
export default {
  testListModels,
  testInstallModel,
  testGenerateText,
  testRemoveModel,
  testGetCatalog,
  testGetCatalogForceRefresh,
  testSearchModels,
  testGetModelInfo,
  runFullTest,
};
