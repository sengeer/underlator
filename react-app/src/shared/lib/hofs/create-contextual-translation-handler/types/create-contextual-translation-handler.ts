/**
 * @interface ApiCallFunction
 * @description Функция для выполнения API вызова к провайдеру LLM
 * Универсальная функция для взаимодействия с различными провайдерами
 * @property {string} prompt - Промпт для отправки в модель
 * @property {Params} params - Параметры генерации
 * @property {AbortSignal} signal - Сигнал для отмены операции
 * @returns {Promise<TApiResponse>} Ответ от API провайдера
 */
export interface ApiCallFunction<TApiResponse> {
  (prompt: string, params: Params, signal?: AbortSignal): Promise<TApiResponse>;
}

/**
 * @interface ResponseProcessorFunction
 * @description Функция для обработки ответа от API провайдера
 * Преобразует ответ провайдера в строку с поддержкой стриминга
 * @property {TApiResponse} response - Ответ от API провайдера
 * @property {(chunkResponse: string) => void} onChunk - Callback для обработки фрагментов ответа
 * @property {(error: string, line?: string) => void} onError - Callback для обработки ошибок
 * @returns {Promise<string>} Полный обработанный ответ
 */
export interface ResponseProcessorFunction<TApiResponse> {
  (
    response: TApiResponse,
    onChunk?: (chunkResponse: string) => void,
    onError?: (error: string, line?: string) => void
  ): Promise<string>;
}

/**
 * @interface ContextualTranslationHandler
 * @description Обработчик контекстного перевода
 * Основная функция для выполнения контекстного перевода текстов
 * @property {string[]} texts - Массив текстов для перевода
 * @property {string} translateLanguage - Направление перевода в формате "source-target"
 * @property {Params} params - Параметры генерации
 * @property {AbortSignal} signal - Сигнал для отмены операции
 * @property {(response: ModelResponse) => void} onModelResponse - Callback для получения ответов модели
 * @returns {Promise<Record<number, string>>} Результат перевода в виде маппинга индексов на переведенные тексты
 */
export interface ContextualTranslationHandler {
  (
    texts: string[],
    translateLanguage: string,
    params: Params,
    signal?: AbortSignal,
    onModelResponse?: (response: ModelResponse) => void
  ): Promise<Record<number, string>>;
}

/**
 * @interface CreateContextualTranslationHandlerFunction
 * @description HOF для создания обработчика контекстного перевода
 * Фабричная функция для создания обработчика с конкретным провайдером
 * @property {ApiCallFunction<TApiResponse>} apiCall - Функция для API вызова
 * @property {ResponseProcessorFunction<TApiResponse>} responseProcessor - Функция обработки ответа
 * @returns {ContextualTranslationHandler} Готовый обработчик контекстного перевода
 */
export interface CreateContextualTranslationHandlerFunction {
  <TApiResponse>(
    apiCall: ApiCallFunction<TApiResponse>,
    responseProcessor: ResponseProcessorFunction<TApiResponse>
  ): ContextualTranslationHandler;
}
