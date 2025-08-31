/**
 * @module OllamaApiTest
 * @description Простой тестовый файл для демонстрации работы Ollama API
 * Используется для проверки функциональности и отладки
 */

import { OllamaApi } from './ollama-api';
import { OllamaErrorHandler } from '../utils/error-handler';

/**
 * @description Пример использования Ollama API
 * Демонстрирует основные возможности созданного HTTP клиента
 */
export class OllamaApiTest {
  private api: OllamaApi;

  constructor(baseUrl?: string) {
    this.api = new OllamaApi({
      baseUrl: baseUrl || 'http://127.0.0.1:11434',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    });
  }

  /**
   * @description Тестирует подключение к Ollama серверу
   * @returns Promise с результатом проверки
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Проверка подключения к Ollama серверу...');
      const isHealthy = await this.api.healthCheck();

      if (isHealthy) {
        console.log('✅ Ollama сервер доступен');
        return true;
      } else {
        console.log('❌ Ollama сервер недоступен');
        return false;
      }
    } catch (error) {
      console.error('❌ Ошибка подключения к Ollama:', error);
      return false;
    }
  }

  /**
   * @description Тестирует получение списка моделей
   * @returns Promise с результатом теста
   */
  async testListModels(): Promise<void> {
    try {
      console.log('📋 Получение списка моделей...');
      const models = await this.api.listModels();

      console.log(`✅ Найдено ${models.models.length} моделей:`);
      models.models.forEach((model) => {
        console.log(`  - ${model.name} (${this.formatSize(model.size)})`);
      });
    } catch (error) {
      console.error('❌ Ошибка получения списка моделей:', error);
      throw error;
    }
  }

  /**
   * @description Тестирует генерацию текста
   * @param modelName - Название модели
   * @param prompt - Текст для генерации
   * @returns Promise с результатом генерации
   */
  async testGeneration(modelName: string, prompt: string): Promise<string> {
    try {
      console.log(`🤖 Генерация текста с моделью ${modelName}...`);
      console.log(`📝 Промпт: "${prompt}"`);

      let fullResponse = '';
      const response = await this.api.generate(
        {
          model: modelName,
          prompt: prompt,
          temperature: 0.7,
          max_tokens: 100,
        },
        (chunk) => {
          // Обрабатываем streaming ответы
          if (chunk.response) {
            fullResponse += chunk.response;
            process.stdout.write(chunk.response);
          }

          if (chunk.done) {
            console.log('\n✅ Генерация завершена');
          }
        }
      );

      return fullResponse;
    } catch (error) {
      console.error('❌ Ошибка генерации:', error);
      throw error;
    }
  }

  /**
   * @description Тестирует установку модели
   * @param modelName - Название модели для установки
   * @returns Promise с результатом установки
   */
  async testInstallModel(modelName: string): Promise<void> {
    try {
      console.log(`📥 Установка модели ${modelName}...`);

      const result = await this.api.installModel(
        { name: modelName },
        (progress) => {
          // Обрабатываем прогресс установки
          if (progress.status === 'downloading') {
            const percent = progress.total
              ? Math.round(((progress.size || 0) / progress.total) * 100)
              : 0;
            console.log(`📥 Загрузка: ${percent}%`);
          } else if (progress.status === 'verifying') {
            console.log('🔍 Проверка модели...');
          } else if (progress.status === 'writing') {
            console.log('💾 Запись модели...');
          } else if (progress.status === 'complete') {
            console.log('✅ Установка завершена');
          }
        }
      );

      if (result.success) {
        console.log('✅ Модель успешно установлена');
      } else {
        console.log('❌ Ошибка установки модели');
      }
    } catch (error) {
      console.error('❌ Ошибка установки модели:', error);
      throw error;
    }
  }

  /**
   * @description Тестирует удаление модели
   * @param modelName - Название модели для удаления
   * @returns Promise с результатом удаления
   */
  async testRemoveModel(modelName: string): Promise<void> {
    try {
      console.log(`🗑️ Удаление модели ${modelName}...`);

      const result = await this.api.removeModel({ name: modelName });

      if (result.success) {
        console.log('✅ Модель успешно удалена');
      } else {
        console.log('❌ Ошибка удаления модели');
      }
    } catch (error) {
      console.error('❌ Ошибка удаления модели:', error);
      throw error;
    }
  }

  /**
   * @description Тестирует получение информации о модели
   * @param modelName - Название модели
   * @returns Promise с информацией о модели
   */
  async testGetModelInfo(modelName: string): Promise<void> {
    try {
      console.log(`ℹ️ Получение информации о модели ${modelName}...`);

      const info = await this.api.getModelInfo(modelName);

      console.log('✅ Информация о модели:');
      console.log(JSON.stringify(info, null, 2));
    } catch (error) {
      console.error('❌ Ошибка получения информации о модели:', error);
      throw error;
    }
  }

  /**
   * @description Запускает полный набор тестов
   * @param modelName - Название модели для тестирования
   * @returns Promise с результатами тестов
   */
  async runFullTest(modelName: string = 'llama2'): Promise<void> {
    console.log('🚀 Запуск полного тестирования Ollama API...\n');

    try {
      // Тест подключения
      const isConnected = await this.testConnection();
      if (!isConnected) {
        console.log('❌ Не удалось подключиться к Ollama серверу');
        return;
      }

      console.log('');

      // Тест списка моделей
      await this.testListModels();
      console.log('');

      // Тест получения информации о модели
      await this.testGetModelInfo(modelName);
      console.log('');

      // Тест генерации (если модель доступна)
      try {
        await this.testGeneration(modelName, 'Привет! Как дела?');
        console.log('');
      } catch (error) {
        console.log(`⚠️ Модель ${modelName} недоступна для генерации`);
      }

      console.log('✅ Все тесты завершены успешно!');
    } catch (error) {
      console.error('❌ Ошибка в тестах:', error);
      throw error;
    }
  }

  /**
   * @description Форматирует размер в байтах в читаемый вид
   * @param bytes - Размер в байтах
   * @returns Отформатированный размер
   */
  private formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

/**
 * @description Функция для быстрого запуска тестов
 * @param baseUrl - Базовый URL Ollama сервера
 * @param modelName - Название модели для тестирования
 */
export async function runOllamaApiTests(
  baseUrl: string = 'http://127.0.0.1:11434',
  modelName: string = 'llama2'
): Promise<void> {
  const tester = new OllamaApiTest(baseUrl);
  await tester.runFullTest(modelName);
}

// Экспорт для использования в других модулях
export default OllamaApiTest;
