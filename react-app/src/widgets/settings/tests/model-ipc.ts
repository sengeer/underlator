/**
 * @module ModelIpcTest
 * Функции для ручного тестирования IPC API.
 * Используется для проверки работы Electron IPC методов.
 */

import { DEFAULT_OPTIONS } from '../../../shared/lib/constants';
import { electron } from '../apis/model-ipc';
import { OLLAMA_TEST_MODEL, OLLAMA_TEST_PROMPT } from '../constants/ipc';

/**
 * Получает список доступных моделей Ollama.
 * Тестирует IPC endpoint models:list.
 */
export async function testListModels() {
  console.log('🧪 Тестирование API получения списка установленных моделей...');
  console.log(await electron.listInstalledModels());
}

/**
 * Устанавливает OLLAMA_TEST_MODEL с выводом прогресса.
 * Тестирует IPC endpoint models:install с streaming прогрессом.
 */
export async function testInstallModel(model = OLLAMA_TEST_MODEL) {
  console.log('🧪 Тестирование API установки модели...');
  console.log(
    await electron.installModel({
      name: model,
    })
  );
}

/**
 * Генерирует текст модели OLLAMA_TEST_MODEL.
 * Тестирует IPC endpoint ollama:generate с streaming ответом.
 */
export async function testGenerateText(
  model = OLLAMA_TEST_MODEL,
  prompt = OLLAMA_TEST_PROMPT
) {
  try {
    console.log(`🧪 Тестирование API генерации текста с моделью ${model}...`);

    let fullResponse = '';
    let isFirstChunk = true;

    const unsubscribeProgress = window.electron.model.onGenerateProgress(
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
    const response = await window.electron.model.generate({
      model: model,
      prompt: prompt,
      ...DEFAULT_OPTIONS,
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
 * Получает каталог моделей Ollama.
 * Тестирует IPC endpoint catalog:get.
 */
export async function testGetCatalog() {
  console.log('🧪 Тестирование API получения каталога моделей...');
  console.log(await electron.getCatalog({ forceRefresh: false }));
}

/**
 * Получает каталог моделей с принудительным обновлением.
 * Тестирует IPC endpoint catalog:get с параметром forceRefresh.
 */
export async function testGetCatalogForceRefresh() {
  console.log(
    '🧪 Тестирование API получения каталога моделей с принудительным обновлением...'
  );
  console.log(await electron.getCatalog({ forceRefresh: true }));
}

/**
 * Выполняет поиск моделей по фильтрам.
 * Тестирует IPC endpoint catalog:search.
 */
export async function testSearchModels() {
  try {
    console.log('🧪 Тестирование API поиска моделей...');

    // Тест 1: Поиск по названию
    console.log('🔍 Поиск моделей с "embed" в названии...');
    const nameSearchResponse = await electron.searchModels({
      search: 'embed',
      type: 'ollama',
    });

    console.log('✅ Результат поиска "embed":', nameSearchResponse);
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
    const sizeSearchResponse = await electron.searchModels({
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
    const tagsSearchResponse = await electron.searchModels({
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
 * Получает информацию детальную информацию о конкретной модели.
 * Тестирует IPC endpoint catalog:get-model-info.
 */
export async function testGetModelInfo(model = OLLAMA_TEST_MODEL) {
  console.log('🧪 Тестирование API получения детальной информации о модели...');
  console.log(
    await electron.getModelInfo({
      modelName: model,
    })
  );
}

/**
 * Удаляет модель.
 * Тестирует IPC endpoint models:remove.
 */
export async function testRemoveModel(model = OLLAMA_TEST_MODEL) {
  console.log(`🧪 Тестирование API удаления модели ${model}...`);
  console.log(
    await electron.removeModel({
      name: model,
    })
  );
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
};
