/**
 * @module EmbeddedOllamaApi
 * @description API для взаимодействия с Ollama через Electron IPC
 * Реализует методы для генерации текста и управления моделями
 */

import type {
  EmbeddedOllamaProvider,
  EmbeddedOllamaConfig,
  EmbeddedOllamaGenerateOptions,
  EmbeddedOllamaGenerateParams,
  EmbeddedOllamaResult,
  EmbeddedOllamaProgressCallback,
  EmbeddedOllamaErrorCallback,
} from './types';

/**
 * @description Конфигурация по умолчанию для embedded-ollama провайдера
 * Базовые настройки для работы с Ollama через Electron IPC
 */
const DEFAULT_CONFIG: EmbeddedOllamaConfig = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * @description Параметры генерации по умолчанию
 * Базовые настройки для генерации текста через Ollama
 */
const DEFAULT_GENERATE_PARAMS: EmbeddedOllamaGenerateParams = {
  model: 'llama3.1',
  temperature: 0.7,
  maxTokens: 2048,
  numPredict: 1,
  think: false,
};

/**
 * @description Проверяет доступность Electron API
 * Убеждается что window.electron доступен для работы
 * @throws Error если Electron API недоступен
 */
function ensureElectronApi(): void {
  if (!window.electron) {
    throw new Error(
      'Electron API недоступен. Убедитесь что приложение запущено в Electron.'
    );
  }
}

/**
 * @description Создает параметры запроса для Ollama генерации
 * Объединяет базовые параметры с пользовательскими настройками
 * @param text - Текст для обработки
 * @param params - Параметры генерации
 * @returns Параметры запроса для Ollama API
 */
function createGenerateRequest(
  text: string | string[],
  params: EmbeddedOllamaGenerateParams
): any {
  // Для массивов текстов создаем промпт с контекстом
  const prompt = Array.isArray(text) ? text.join('\n\n') : text;

  return {
    model: params.model,
    prompt,
    system: params.system,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    num_predict: params.numPredict,
    think: params.think,
    options: params.options,
  };
}

/**
 * @description Обрабатывает ошибки IPC операций
 * Преобразует ошибки в стандартный формат
 * @param error - Объект ошибки
 * @param context - Контекст операции
 * @returns Стандартизированная ошибка
 */
function handleIpcError(error: any, context: string): Error {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const fullMessage = `${context}: ${errorMessage}`;

  console.error(`[EmbeddedOllama] ${fullMessage}`, error);

  return new Error(fullMessage);
}

/**
 * @description Создает результат операции с ошибкой
 * Форматирует ошибку в стандартный формат результата
 * @param error - Объект ошибки
 * @param status - Статус операции
 * @returns Результат операции с ошибкой
 */
function createErrorResult<T>(
  error: any,
  status: 'error' = 'error'
): EmbeddedOllamaResult<T> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    success: false,
    error: errorMessage,
    status,
  };
}

/**
 * @description Создает успешный результат операции
 * Форматирует данные в стандартный формат результата
 * @param data - Данные результата
 * @returns Результат операции с данными
 */
function createSuccessResult<T>(data: T): EmbeddedOllamaResult<T> {
  return {
    success: true,
    data,
    status: 'success',
  };
}

/**
 * @description Реализация embedded-ollama провайдера
 * Обеспечивает взаимодействие с Ollama через Electron IPC
 */
export const embeddedOllamaProvider: EmbeddedOllamaProvider = {
  /**
   * @description Инициализация провайдера
   * Проверяет доступность Electron API и настраивает конфигурацию
   * @param config - Конфигурация провайдера
   */
  async initialize(config?: EmbeddedOllamaConfig): Promise<void> {
    try {
      ensureElectronApi();

      // Сохраняем конфигурацию для использования в других методах
      const finalConfig = { ...DEFAULT_CONFIG, ...config };

      console.log(
        '[EmbeddedOllama] Провайдер инициализирован с конфигурацией:',
        finalConfig
      );
    } catch (error) {
      throw handleIpcError(error, 'Ошибка инициализации провайдера');
    }
  },

  /**
   * @description Генерация текста через Ollama
   * Отправляет запрос на генерацию через Electron IPC
   * @param options - Опции генерации
   */
  async generate(options: EmbeddedOllamaGenerateOptions): Promise<void> {
    try {
      ensureElectronApi();

      const {
        text,
        ollamaParams = DEFAULT_GENERATE_PARAMS,
        onModelResponse,
        onProgress,
        signal,
      } = options;

      // Создаем запрос для Ollama
      const request = createGenerateRequest(text, ollamaParams);

      // Подписываемся на прогресс генерации
      const unsubscribeProgress = window.electron.ollama.onGenerateProgress(
        (chunk: any) => {
          if (onProgress) {
            onProgress({
              token: chunk.response,
              progress: chunk.eval_count
                ? (chunk.eval_count /
                    (chunk.eval_count + chunk.prompt_eval_count)) *
                  100
                : undefined,
              totalTokens: chunk.eval_count,
              startTime: chunk.created_at,
            });
          }

          if (onModelResponse && chunk.response) {
            onModelResponse(chunk.response);
          }
        }
      );

      try {
        // Отправляем запрос на генерацию
        const response = await window.electron.ollama.generate(request);

        // Обрабатываем финальный ответ
        if (onModelResponse && response) {
          onModelResponse(response);
        }
      } finally {
        // Отписываемся от прогресса
        unsubscribeProgress();
      }
    } catch (error) {
      throw handleIpcError(error, 'Ошибка генерации текста');
    }
  },

  /**
   * @description Получение списка доступных моделей
   * @returns Список моделей через Electron IPC
   */
  async listModels(): Promise<EmbeddedOllamaResult<any>> {
    try {
      ensureElectronApi();

      const response = await window.electron.models.list();

      if (response.success) {
        return createSuccessResult(response.data);
      } else {
        return createErrorResult(response.error);
      }
    } catch (error) {
      return createErrorResult(error);
    }
  },

  /**
   * @description Установка модели через Ollama
   * @param modelName - Название модели для установки
   * @returns Результат установки модели
   */
  async installModel(modelName: string): Promise<EmbeddedOllamaResult<void>> {
    try {
      ensureElectronApi();

      const response = await window.electron.models.install({
        name: modelName,
      });

      if (response.success) {
        return createSuccessResult(undefined);
      } else {
        return createErrorResult(response.error);
      }
    } catch (error) {
      return createErrorResult(error);
    }
  },

  /**
   * @description Удаление модели через Ollama
   * @param modelName - Название модели для удаления
   * @returns Результат удаления модели
   */
  async removeModel(modelName: string): Promise<EmbeddedOllamaResult<void>> {
    try {
      ensureElectronApi();

      const response = await window.electron.models.remove({
        name: modelName,
      });

      if (response.success) {
        return createSuccessResult(undefined);
      } else {
        return createErrorResult(response.error);
      }
    } catch (error) {
      return createErrorResult(error);
    }
  },

  /**
   * @description Проверка статуса Ollama сервера
   * @returns Статус доступности Ollama сервера
   */
  async healthCheck(): Promise<EmbeddedOllamaResult<boolean>> {
    try {
      ensureElectronApi();

      // Используем listModels как health check
      const response = await window.electron.models.list();

      return createSuccessResult(response.success);
    } catch (error) {
      return createErrorResult(error);
    }
  },

  /**
   * @description Отмена текущей операции
   * Использует AbortController для отмены операций
   */
  abort(): void {
    // Реализация отмены будет добавлена в следующих этапах
    console.log('[EmbeddedOllama] Отмена операции запрошена');
  },
};
