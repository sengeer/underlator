import {
  OLLAMA_TEST_MODEL,
  OLLAMA_TEST_PROMPT,
} from '../../../shared/lib/constants';

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
  try {
    console.log('🧪 Тестирование получения списка моделей...');

    const response = await window.electron.models.list();

    console.log('✅ Список моделей получен:', response);

    if (response.success && response.data && response.data.models) {
      const models = response.data.models;
      console.log(`📋 Найдено ${models.length} моделей:`);
      models.forEach((model, index) => {
        console.log(
          `  ${index + 1}. ${model.name} (${formatSize(model.size)})`
        );
      });
    } else {
      console.log('📋 Модели не найдены');
      if (response.error) {
        console.log('❌ Ошибка:', response.error);
      }
    }

    return response;
  } catch (error) {
    console.error('❌ Ошибка получения списка моделей:', error);
    throw error;
  }
}

/**
 * @description Скачивает OLLAMA_TEST_MODEL с выводом прогресса
 * Тестирует IPC endpoint models:install с streaming прогрессом
 */

export async function testDownloadModel() {
  try {
    console.log(`🧪 Тестирование скачивания модели ${OLLAMA_TEST_MODEL}...`);

    // Подписывание на прогресс загрузки
    const unsubscribeProgress = window.electron.models.onInstallProgress(
      (progress) => {
        console.log('📥 Прогресс загрузки:', progress);

        if (progress.status === 'downloading' && progress.total) {
          const percent = Math.round(
            ((progress.size || 0) / progress.total) * 100
          );
          console.log(
            `📥 Загрузка: ${percent}% (${progress.size}/${progress.total} байт)`
          );
        } else if (progress.status === 'verifying') {
          console.log('🔍 Проверка модели...');
        } else if (progress.status === 'writing') {
          console.log('💾 Запись модели...');
        } else if (progress.status === 'complete') {
          console.log('✅ Загрузка завершена!');
        }
      }
    );

    const response = await window.electron.models.install({
      name: OLLAMA_TEST_MODEL,
    });

    unsubscribeProgress();

    console.log('✅ Результат загрузки:', response);

    if (response.success) {
      console.log(`✅ Модель ${OLLAMA_TEST_MODEL} успешно загружена!`);
    } else {
      console.log('❌ Ошибка загрузки модели');
      if (response.error) {
        console.log('❌ Детали ошибки:', response.error);
      }
    }

    return response;
  } catch (error) {
    console.error('❌ Ошибка скачивания модели:', error);
    throw error;
  }
}

/**
 * @description Генерирует текст модели OLLAMA_TEST_MODEL
 * Тестирует IPC endpoint ollama:generate с streaming ответом
 */

export async function testGenerateText() {
  try {
    console.log(
      `🧪 Тестирование генерации текста с моделью ${OLLAMA_TEST_MODEL}...`
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
  try {
    console.log('🧪 Тестирование получения каталога моделей...');

    const response = await window.electron.catalog.get();

    console.log('✅ Каталог моделей получен:', response);

    if (response && response.ollama) {
      const models = response.ollama;
      console.log(`📋 Найдено ${models.length} моделей в каталоге:`);
      models.slice(0, 10).forEach((model, index) => {
        console.log(
          `  ${index + 1}. ${model.name} (${formatSize(model.size)})`
        );
      });
      if (models.length > 10) {
        console.log(`  ... и еще ${models.length - 10} моделей`);
      }
    } else {
      console.log('📋 Каталог пуст или недоступен');
    }

    return response;
  } catch (error) {
    console.error('❌ Ошибка получения каталога:', error);
    throw error;
  }
}

/**
 * @description Получает каталог моделей с принудительным обновлением
 * Тестирует IPC endpoint catalog:get с параметром forceRefresh
 */
export async function testGetCatalogForceRefresh() {
  try {
    console.log(
      '🧪 Тестирование получения каталога с принудительным обновлением...'
    );

    const response = await window.electron.catalog.get({ forceRefresh: true });

    console.log(
      '✅ Каталог моделей получен (принудительное обновление):',
      response
    );

    if (response && response.ollama) {
      const models = response.ollama;
      console.log(`📋 Найдено ${models.length} моделей в обновленном каталоге`);
    }

    return response;
  } catch (error) {
    console.error('❌ Ошибка получения каталога с обновлением:', error);
    throw error;
  }
}

/**
 * @description Выполняет поиск моделей по фильтрам
 * Тестирует IPC endpoint catalog:search
 */
export async function testSearchModels() {
  try {
    console.log('🧪 Тестирование поиска моделей...');

    // Тест 1: Поиск по названию
    console.log('🔍 Поиск моделей с "llama" в названии...');
    const searchResponse1 = await window.electron.catalog.search({
      search: 'llama',
      type: 'ollama',
    });

    console.log('✅ Результат поиска "llama":', searchResponse1);
    if (
      searchResponse1 &&
      searchResponse1.data &&
      searchResponse1.data.ollama
    ) {
      console.log(
        `📋 Найдено ${searchResponse1.data.ollama.length} моделей с "llama"`
      );
    }

    // Тест 2: Поиск по размеру
    console.log('🔍 Поиск моделей размером менее 1GB...');
    const searchResponse2 = await window.electron.catalog.search({
      maxSize: 1024 * 1024 * 1024, // 1GB
      type: 'ollama',
    });

    console.log('✅ Результат поиска по размеру:', searchResponse2);
    if (
      searchResponse2 &&
      searchResponse2.data &&
      searchResponse2.data.ollama
    ) {
      console.log(
        `📋 Найдено ${searchResponse2.data.ollama.length} моделей менее 1GB`
      );
    }

    // Тест 3: Поиск по тегам
    console.log('🔍 Поиск моделей с тегом "chat"...');
    const searchResponse3 = await window.electron.catalog.search({
      tags: ['chat'],
      type: 'ollama',
    });

    console.log('✅ Результат поиска по тегам:', searchResponse3);
    if (
      searchResponse3 &&
      searchResponse3.data &&
      searchResponse3.data.ollama
    ) {
      console.log(
        `📋 Найдено ${searchResponse3.data.ollama.length} моделей с тегом "chat"`
      );
    }

    return {
      searchByName: searchResponse1,
      searchBySize: searchResponse2,
      searchByTags: searchResponse3,
    };
  } catch (error) {
    console.error('❌ Ошибка поиска моделей:', error);
    throw error;
  }
}

/**
 * @description Получает информацию о конкретной модели
 * Тестирует IPC endpoint catalog:get-model-info
 */
export async function testGetModelInfo() {
  try {
    console.log('🧪 Тестирование получения информации о модели...');

    // Сначала получаем каталог, чтобы найти доступную модель
    const catalogResponse = await window.electron.catalog.get();

    if (
      !catalogResponse ||
      !catalogResponse.data ||
      !catalogResponse.data.ollama ||
      catalogResponse.data.ollama.length === 0
    ) {
      console.log(
        '❌ Каталог пуст, невозможно протестировать получение информации о модели'
      );
      return null;
    }

    const testModelName = catalogResponse.data.ollama[0].name;
    console.log(`🔍 Получение информации о модели: ${testModelName}`);

    const response = await window.electron.catalog.getModelInfo({
      modelName: testModelName,
    });

    console.log('✅ Информация о модели получена:', response);

    if (response && response.data) {
      console.log(`📋 Модель: ${response.data.name}`);
      console.log(`📋 Размер: ${formatSize(response.data.size)}`);
      console.log(
        `📋 Описание: ${response.data.description || 'Нет описания'}`
      );
      console.log(
        `📋 Теги: ${response.data.tags ? response.data.tags.join(', ') : 'Нет тегов'}`
      );
    } else {
      console.log('❌ Модель не найдена');
    }

    return response;
  } catch (error) {
    console.error('❌ Ошибка получения информации о модели:', error);
    throw error;
  }
}

/**
 * @description Удаляет модель
 * Тестирует IPC endpoint models:remove
 */

export async function testRemoveModel() {
  try {
    console.log(`🧪 Тестирование удаления модели ${OLLAMA_TEST_MODEL}...`);

    const response = await window.electron.models.remove({
      name: OLLAMA_TEST_MODEL,
    });

    console.log('✅ Результат удаления:', response);

    if (response.success) {
      console.log(`✅ Модель ${OLLAMA_TEST_MODEL} успешно удалена!`);
    } else {
      console.log('❌ Ошибка удаления модели');
      if (response.error) {
        console.log('❌ Детали ошибки:', response.error);
      }
    }

    return response;
  } catch (error) {
    console.error('❌ Ошибка удаления модели:', error);
    throw error;
  }
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
    await testDownloadModel();
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

/**
 * @description Форматирует размер в байтах в читаемый вид
 * @param {number} bytes - Размер в байтах
 * @returns {string} Отформатированный размер
 */

function formatSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Экспорт для использования в других модулях
export default {
  testListModels,
  testDownloadModel,
  testGenerateText,
  testRemoveModel,
  testGetCatalog,
  testGetCatalogForceRefresh,
  testSearchModels,
  testGetModelInfo,
  runFullTest,
};
