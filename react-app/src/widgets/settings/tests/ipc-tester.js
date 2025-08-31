import { OLLAMA_TEST_MODEL } from '../../../shared/lib/constants';

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

    const models = await window.electron.models.list();

    console.log('✅ Список моделей получен:', models);

    if (models.models && models.models.length > 0) {
      console.log(`📋 Найдено ${models.models.length} моделей:`);
      models.models.forEach((model, index) => {
        console.log(
          `  ${index + 1}. ${model.name} (${formatSize(model.size)})`
        );
      });
    } else {
      console.log('📋 Модели не найдены');
    }

    return models;
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

    // Подписываемся на прогресс загрузки
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

    const result = await window.electron.models.install({
      name: OLLAMA_TEST_MODEL,
    });

    unsubscribeProgress();

    console.log('✅ Результат загрузки:', result);

    if (result.success) {
      console.log(`✅ Модель ${OLLAMA_TEST_MODEL} успешно загружена!`);
    } else {
      console.log('❌ Ошибка загрузки модели');
    }

    return result;
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

    // Запускаем генерацию
    const response = await window.electron.ollama.generate({
      model: OLLAMA_TEST_MODEL,
      prompt: 'Сгенерируй стихотворенье про AI',
      temperature: 0.7,
      max_tokens: 200,
      num_predict: 1,
    });

    // Отписываемся от прогресса
    unsubscribeProgress();

    console.log('✅ Генерация завершена');
    console.log('📝 Финальный ответ:', response);

    return response;
  } catch (error) {
    console.error('❌ Ошибка генерации текста:', error);
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

    const result = await window.electron.models.remove({
      name: OLLAMA_TEST_MODEL,
    });

    console.log('✅ Результат удаления:', result);

    if (result.success) {
      console.log(`✅ Модель ${OLLAMA_TEST_MODEL} успешно удалена!`);
    } else {
      console.log('❌ Ошибка удаления модели');
    }

    return result;
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

    console.log('=== ТЕСТ 2: Скачивание модели ===');
    await testDownloadModel();
    console.log('');

    console.log('=== ТЕСТ 3: Генерация текста ===');
    await testGenerateText();
    console.log('');

    console.log('=== ТЕСТ 4: Удаление модели ===');
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
  runFullTest,
};
